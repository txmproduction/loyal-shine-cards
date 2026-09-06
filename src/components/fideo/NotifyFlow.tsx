import { useState } from "react";
import { Bell, ChevronLeft, Loader2, Send } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { envoyerNotificationPromo } from "@/lib/notifications.functions";

const MAX = 150;

export function NotifyFlow({
  count,
  nomCommerce,
  iconUrl,
}: {
  count: number;
  nomCommerce: string;
  iconUrl?: string | null | undefined;
}) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const send = useServerFn(envoyerNotificationPromo);

  const close = () => {
    setStep(0);
    setMessage("");
  };

  const submit = async () => {
    setSending(true);
    try {
      const res = await send({ data: { message: message.trim() } });
      const touched = res.apple + res.google;
      toast.success(
        touched > 0
          ? `Notification envoyée à ${touched} client${touched > 1 ? "s" : ""}`
          : "Aucun client wallet-actif à notifier",
        {
          description: `Apple Wallet : ${res.apple} · Google Wallet : ${res.google}`,
        },
      );
      close();
    } catch (e) {
      toast.error("Envoi impossible", {
        description: e instanceof Error ? e.message : "Veuillez réessayer.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        className="w-full sm:w-auto"
        onClick={() => setStep(1)}
      >
        <Bell className="mr-2 h-5 w-5" />
        Envoyer une notification à {count} client{count > 1 ? "s" : ""}
      </Button>

      {/* Écran 2 — Rédaction */}
      <Dialog open={step === 1} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rédiger votre notification</DialogTitle>
            <DialogDescription>
              Elle sera envoyée à {count} client{count > 1 ? "s" : ""} enregistré
              {count > 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              autoFocus
              rows={4}
              maxLength={MAX}
              placeholder="Ex : -20 % sur toute la boutique ce week-end !"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX))}
            />
            <p className="text-right text-xs text-muted-foreground">
              {MAX - message.length} caractère{MAX - message.length > 1 ? "s" : ""} restant
              {MAX - message.length > 1 ? "s" : ""}
            </p>
          </div>
          <DialogFooter>
            <Button disabled={!message.trim()} onClick={() => setStep(2)}>
              Aperçu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Écran 3 — Aperçu */}
      <Dialog open={step === 2} onOpenChange={(o) => !o && !sending && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aperçu de la notification</DialogTitle>
            <DialogDescription>Voici ce que verront vos clients.</DialogDescription>
          </DialogHeader>

          <PhoneMockup nomCommerce={nomCommerce} iconUrl={iconUrl} message={message} />

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="ghost" disabled={sending} onClick={() => setStep(1)}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Modifier
            </Button>
            <Button size="lg" disabled={sending} onClick={() => void submit()}>
              {sending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {sending ? "Envoi…" : "Envoyer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PhoneMockup({
  nomCommerce,
  iconUrl,
  message,
}: {
  nomCommerce: string;
  iconUrl?: string | null | undefined;
  message: string;
}) {
  const now = new Date();
  return (
    <div className="flex justify-center py-2 [perspective:1400px]">
      <div
        className="aspect-[9/19.5] w-[270px] rounded-[2.6rem] border border-border/60 bg-sidebar p-2 shadow-violet transition-transform duration-500 sm:w-[300px] sm:rounded-[3rem] sm:p-2.5"
        style={{ transform: "rotateX(4deg) rotateY(-4deg)" }}
      >
        <div className="relative flex h-full flex-col overflow-hidden rounded-[2.1rem] bg-ink-gradient px-2.5 pb-4 pt-2 sm:rounded-[2.4rem]">
          {/* Encoche */}
          <div className="mx-auto mb-7 h-4 w-16 rounded-full bg-background/70 sm:mb-9 sm:h-5 sm:w-20" />
          {/* Horloge écran verrouillé */}
          <div className="text-center text-sidebar-foreground">
            <p className="text-xs opacity-70">
              {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <p className="font-display text-[2.5rem] font-bold leading-none">
              {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>

          {/* Notification — proportions réelles iOS */}
          <div className="mx-1 mt-5 rounded-[1.1rem] border border-white/10 bg-white/12 px-2.5 py-2 backdrop-blur-md">
            <div className="flex items-center gap-1.5">
              {iconUrl ? (
                <img src={iconUrl} alt="" className="h-3.5 w-3.5 shrink-0 rounded-[4px] object-cover" />
              ) : (
                <span className="bg-brand flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] text-[8px] font-bold text-primary-foreground">
                  {nomCommerce.slice(0, 1).toUpperCase()}
                </span>
              )}
              <p className="min-w-0 flex-1 truncate text-[9px] font-medium uppercase tracking-wide text-sidebar-foreground/60">
                Fidéo · {nomCommerce}
              </p>
              <span className="shrink-0 text-[9px] text-sidebar-foreground/60">maintenant</span>
            </div>
            <p className="mt-1 truncate text-[11px] font-semibold leading-tight text-sidebar-foreground">
              {nomCommerce}
            </p>
            <p className="mt-0.5 break-words text-[11px] leading-snug text-sidebar-foreground/90">
              {message || "Votre message apparaîtra ici."}
            </p>
          </div>

          <div className="mx-auto mt-auto h-1 w-20 rounded-full bg-white/40" />
        </div>
      </div>
    </div>
  );
}
