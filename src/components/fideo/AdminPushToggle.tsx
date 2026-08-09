import { useEffect, useState } from "react";
import { Bell, BellOff, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  getExistingSubscription,
  needsIosInstall,
  pushSupported,
  subscribeToPush,
} from "@/lib/push";
import {
  removeAdminPushSubscription,
  saveAdminPushSubscription,
} from "@/lib/push.functions";

export function AdminPushToggle() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    setIosHint(needsIosInstall() && !pushSupported());
    if (!pushSupported()) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
    void getExistingSubscription().then((sub) => setEnabled(!!sub));
  }, []);

  const toggle = async (next: boolean) => {
    setBusy(true);
    try {
      if (next) {
        const sub = await subscribeToPush();
        setPermission(Notification.permission);
        const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh: string; auth: string } };
        await saveAdminPushSubscription({
          data: { subscription: { endpoint: json.endpoint!, keys: json.keys! } },
        });
        setEnabled(true);
        toast.success("Notifications activées");
      } else {
        const sub = await getExistingSubscription();
        if (sub) {
          await removeAdminPushSubscription({ data: { endpoint: sub.endpoint } });
          await sub.unsubscribe();
        }
        setEnabled(false);
        toast.success("Notifications désactivées");
      }
    } catch (err) {
      if (err instanceof Error && err.message === "permission-denied") {
        setPermission("denied");
        toast.error("Permission refusée par le navigateur");
      } else {
        toast.error("Action impossible", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const statusLabel =
    permission === "unsupported"
      ? "Non pris en charge sur cet appareil"
      : permission === "denied"
        ? "Permission refusée — autorisez les notifications dans les réglages du navigateur"
        : enabled
          ? "Activé"
          : "Désactivé";

  return (
    <section className="animate-rise rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex flex-wrap items-center gap-4">
        <span className="bg-brand flex h-10 w-10 items-center justify-center rounded-xl text-primary-foreground">
          {enabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            Recevoir une notification à chaque nouvelle inscription
          </p>
          <p className="text-xs text-muted-foreground">{statusLabel}</p>
        </div>
        <Switch
          checked={enabled}
          disabled={busy || permission === "unsupported" || (permission === "denied" && !enabled)}
          onCheckedChange={(v) => void toggle(v)}
          aria-label="Activer les notifications d'inscription"
        />
      </div>
      {(iosHint || permission === "unsupported") && needsIosInstall() && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
          Pour recevoir les notifications sur iPhone, ajoutez d'abord Fidéo à votre écran d'accueil :
          bouton Partager → Sur l'écran d'accueil.
        </p>
      )}
    </section>
  );
}