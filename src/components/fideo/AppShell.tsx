import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, IdCard, BadgeCheck, LogOut, ShieldCheck, ScanLine } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { QrScanner } from "@/components/fideo/QrScanner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  BRAND_LOGO,
  accessState,
  trialDaysLeft,
  useEmployeeSelf,
  useIsAdmin,
  useMerchant,
} from "@/lib/fideo";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/employes", label: "Employés", icon: BadgeCheck },
  { to: "/carte", label: "Carte de fidélité", icon: IdCard },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { data: merchant } = useMerchant();
  const { data: isAdmin } = useIsAdmin();
  const { data: employee } = useEmployeeSelf();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [scanOpen, setScanOpen] = useState(false);

  const onScan = (text: string) => {
    setScanOpen(false);
    const id = text.trim().split("/").pop() ?? "";
    if (!id) {
      toast.error("QR code illisible");
      return;
    }
    void navigate({ to: "/clients", search: { c: id } });
  };
  const nav = employee
    ? ([{ to: "/clients", label: "Mes clients", icon: Users }] as const)
    : isAdmin
      ? [...NAV, { to: "/admin", label: "Administration", icon: ShieldCheck } as const]
      : NAV;

  const signOut = async () => {
    await supabase.auth.signOut();
    void navigate({ to: "/auth" });
  };

  const state = accessState(merchant ?? null);
  const days = trialDaysLeft(merchant?.trial_ends_at);

  const banner =
    state === "trial"
      ? {
          text: `Essai gratuit — ${days} jour${days > 1 ? "s" : ""} restant${days > 1 ? "s" : ""}`,
          cls: "bg-brand text-primary-foreground",
        }
      : state === "expired"
        ? {
            text: "Essai gratuit terminé — mettez à jour votre moyen de paiement, vos QR codes sont désactivés",
            cls: "bg-destructive text-destructive-foreground",
          }
        : state === "suspended"
          ? {
              text: "Accès suspendu — mettez à jour votre moyen de paiement, vos QR codes sont désactivés",
              cls: "bg-destructive text-destructive-foreground",
            }
          : null;

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="bg-ink-gradient text-sidebar-foreground lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:shrink-0">
        <div className="flex items-center gap-3 px-5 py-5">
          <img src={BRAND_LOGO} alt="Logo Fidéo" className="h-10 w-10 rounded-xl object-contain" />
          <div>
            <p className="font-display text-lg font-bold leading-none">Fidéo</p>
            <p className="mt-1 text-xs text-sidebar-foreground/60">
              {employee
                ? `${merchant?.nom_commerce ?? "Commerce"} · ${employee.nom}`
                : (merchant?.nom_commerce ?? "Votre commerce")}
            </p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
          {nav.map(({ to, label, icon: Icon }) => {
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
      <div className="min-w-0 flex-1">
        {banner && (
          <div
            className={cn(
              "px-4 py-2 text-center text-xs font-semibold sm:text-sm",
              banner.cls,
            )}
          >
            {banner.text}
          </div>
        )}
        <main className="animate-fade px-4 py-6 sm:px-8 sm:py-10">{children}</main>
      </div>

      <button
        onClick={() => setScanOpen(true)}
        aria-label="Scanner un client"
        className="bg-brand fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-violet transition-transform duration-200 hover:scale-105 active:scale-95"
      >
        <ScanLine className="h-5 w-5" />
        <span className="hidden sm:inline">Scanner un client</span>
      </button>

      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scanner un client</DialogTitle>
            <DialogDescription>
              Approchez le QR code de la carte de fidélité du client.
            </DialogDescription>
          </DialogHeader>
          {scanOpen && <QrScanner onResult={onScan} onError={(m) => toast.error(m)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
