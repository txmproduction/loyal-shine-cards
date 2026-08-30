import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/fideo/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    // Admins et employés ne sont pas soumis au parcours d'onboarding.
    const { data: admin } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (admin) return { user: data.user };

    const { data: employee } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (employee) return { user: data.user };

    // Pour les commerçants, l'onboarding doit être terminé avant d'accéder au reste de l'app.
    const { data: merchant } = await supabase
      .from("merchants")
      .select(
        "id, onboarding_completed, nom_commerce, telephone, adresse, logo_url, secteur, couleur_marque",
      )
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (merchant && merchant.onboarding_completed !== true && location.pathname !== "/onboarding") {
      throw redirect({ to: "/onboarding", replace: true });
    }

    return { user: data.user };
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
