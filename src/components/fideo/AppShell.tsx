import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, PlusCircle, IdCard, BadgeCheck, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BRAND_LOGO, useMerchant } from "@/lib/fideo";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard },
  { to: "/points", label: "Ajouter un point", icon: PlusCircle },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/employes", label: "Employés", icon: BadgeCheck },
  { to: "/carte", label: "Carte de fidélité", icon: IdCard },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { data: merchant } = useMerchant();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const signOut = async () => {
    await supabase.auth.signOut();
    void navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="bg-ink-gradient text-sidebar-foreground lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:shrink-0">
        <div className="flex items-center gap-3 px-5 py-5">
          <img src={BRAND_LOGO} alt="Logo Fidéo" className="h-10 w-10 rounded-xl object-contain" />
          <div>
            <p className="font-display text-lg font-bold leading-none">Fidéo</p>
            <p className="mt-1 text-xs text-sidebar-foreground/60">
              {merchant?.nom_commerce ?? "Votre commerce"}
            </p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "group flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-violet"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                <span className="whitespace-nowrap">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="hidden px-3 lg:block">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-4 w-4" /> Déconnexion
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 animate-fade px-4 py-6 sm:px-8 sm:py-10">{children}</main>
    </div>
  );
}
