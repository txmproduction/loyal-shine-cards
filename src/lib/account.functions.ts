import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Suppression définitive du compte connecté (exigence App Store 5.1.1v).
 * - Commerçant : supprime le commerce et toutes les données liées (cascade), puis le compte Auth.
 * - Employé : supprime sa fiche employé et son compte Auth.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: merchant } = await supabaseAdmin
      .from("merchants")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (merchant) {
      // Les passes Apple enregistrés référencent les clients par leur identifiant.
      const { data: customers } = await supabaseAdmin
        .from("customers")
        .select("id")
        .eq("merchant_id", merchant.id);
      const serials = (customers ?? []).map((c) => c.id);
      if (serials.length > 0) {
        await supabaseAdmin.from("apple_pass_registrations").delete().in("serial_number", serials);
      }

      // Les employés ont leur propre compte Auth : on les supprime aussi.
      const { data: employees } = await supabaseAdmin
        .from("employees")
        .select("user_id")
        .eq("merchant_id", merchant.id);
      for (const emp of employees ?? []) {
        if (emp.user_id) await supabaseAdmin.auth.admin.deleteUser(emp.user_id);
      }

      // Cascade : customers, employees, establishments, loyalty_cards, points_history, rewards_redeemed.
      const { error: delErr } = await supabaseAdmin.from("merchants").delete().eq("id", merchant.id);
      if (delErr) throw new Error(delErr.message);
    } else {
      const { error: empErr } = await supabaseAdmin
        .from("employees")
        .delete()
        .eq("user_id", userId);
      if (empErr) throw new Error(empErr.message);
    }

    await supabaseAdmin.from("admin_push_subscriptions").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);

    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authErr) throw new Error(authErr.message);

    return { ok: true };
  });
