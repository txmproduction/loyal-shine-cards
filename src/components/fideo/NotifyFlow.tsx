import { useState } from "react";
import { Bell, ChevronLeft, Send } from "lucide-react";
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
  const [done, setDone] = useState(false);

  const close = () => {
    setStep(0);
    setMessage("");
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
      <Dialog open={step === 2} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aperçu de la notification</DialogTitle>
            <DialogDescription>Voici ce que verront vos clients.</DialogDescription>
          </DialogHeader>

          <PhoneMockup nomCommerce={nomCommerce} iconUrl={iconUrl} message={message} />

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Modifier
            </Button>
            <Button size="lg" onClick={() => setDone(true)}>
              <Send className="mr-2 h-4 w-4" /> Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Placeholder */}
      <Dialog
        open={done}
        onOpenChange={(o) => {
          if (!o) {
            setDone(false);
            close();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bientôt disponible</DialogTitle>
            <DialogDescription>
              L'envoi de notifications push à vos clients sera activé très prochainement.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                setDone(false);
                close();
              }}
            >
              Compris
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
    <div className="flex justify-center py-2 [perspective:1200px]">
      <div
        className="aspect-[9/19.5] w-[190px] rounded-[2.2rem] border border-border/60 bg-sidebar p-1.5 shadow-violet transition-transform duration-500 sm:w-[220px] sm:rounded-[2.6rem] sm:p-2"
        style={{ transform: "rotateX(6deg) rotateY(-6deg)" }}
      >
        <div className="relative flex h-full flex-col overflow-hidden rounded-[1.8rem] bg-ink-gradient px-3 pb-5 pt-2.5 sm:rounded-[2.1rem]">
          <div className="mx-auto mb-8 h-5 w-20 rounded-full bg-background/70 sm:mb-10 sm:h-6 sm:w-24" />
          <div className="text-center text-sidebar-foreground">
            <p className="text-sm opacity-70">
              {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <p className="font-display text-[2.75rem] font-bold leading-none sm:text-5xl">
              {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/12 p-3 backdrop-blur-md">
            <div className="flex items-start gap-2.5">
              {iconUrl ? (
                <img
                  src={iconUrl}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span className="bg-brand flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-primary-foreground">
                  {nomCommerce.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className="min-w-0 flex-1 truncate text-[13px] font-bold text-sidebar-foreground">
                    {nomCommerce}
                  </p>
                  <span className="shrink-0 text-[11px] text-sidebar-foreground/60">maintenant</span>
                </div>
                <p className="mt-0.5 break-words text-[13px] leading-snug text-sidebar-foreground/90">
                  {message || "Votre message apparaîtra ici."}
                </p>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-auto h-1 w-20 rounded-full bg-white/40" />
        </div>
      </div>
    </div>
  );
}
