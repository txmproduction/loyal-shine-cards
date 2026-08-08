import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { employeeLoginEmail, pinToPassword } from "@/lib/employee-login";

export const createEmployeeAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { nom: string; pin: string; role: string }) => {
    const nom = input.nom.trim();
    const pin = input.pin.trim();
    if (!nom) throw new Error("Le prénom de l'employé est obligatoire");
    if (!/^\d{4,6}$/.test(pin)) throw new Error("Le code PIN doit contenir 4 à 6 chiffres");
    return { nom, pin, role: input.role === "manager" ? "manager" : "employe" };
  })
  .handler(async ({ data, context }) => {
    const { data: merchant, error: mErr } = await context.supabase
      .from("merchants")
      .select("id, nom_commerce")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (mErr) throw new Error(mErr.message);
    if (!merchant) throw new Error("Commerce introuvable");

    const email = employeeLoginEmail(merchant.nom_commerce, data.nom);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: pinToPassword(data.pin),
      email_confirm: true,
      user_metadata: { is_employee: true, nom: data.nom, merchant_id: merchant.id },
    });
    if (authErr || !created.user) {
      throw new Error(
        authErr?.message?.includes("already")
          ? `Un accès existe déjà pour ${email}. Choisissez un autre prénom.`
          : (authErr?.message ?? "Création de l'accès impossible"),
      );
    }

    const { error: insErr } = await context.supabase.from("employees").insert({
      merchant_id: merchant.id,
      nom: data.nom,
      pin_code: data.pin,
      role: data.role,
      user_id: created.user.id,
    });
    if (insErr) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error(insErr.message);
    }

    return { email };
  });

export const deleteEmployeeAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: input.id }))
  .handler(async ({ data, context }) => {
    const { data: emp, error } = await context.supabase
      .from("employees")
      .select("id, user_id")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!emp) throw new Error("Employé introuvable");

    const { error: delErr } = await context.supabase.from("employees").delete().eq("id", emp.id);
    if (delErr) throw new Error(delErr.message);

    if (emp.user_id) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.auth.admin.deleteUser(emp.user_id);
    }
    return { ok: true };
  });

export const resetEmployeePin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; pin: string }) => {
    if (!/^\d{4,6}$/.test(input.pin.trim())) throw new Error("Le code PIN doit contenir 4 à 6 chiffres");
    return { id: input.id, pin: input.pin.trim() };
  })
  .handler(async ({ data, context }) => {
    const { data: emp, error } = await context.supabase
      .from("employees")
      .select("id, user_id")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!emp?.user_id) throw new Error("Cet employé n'a pas d'accès de connexion");

    const { error: upErr } = await context.supabase
      .from("employees")
      .update({ pin_code: data.pin })
      .eq("id", emp.id);
    if (upErr) throw new Error(upErr.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(emp.user_id, {
      password: pinToPassword(data.pin),
    });
    if (authErr) throw new Error(authErr.message);
    return { ok: true };
  });
