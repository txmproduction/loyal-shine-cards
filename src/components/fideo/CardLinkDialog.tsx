import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, MessageCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { normalizePhone, phoneKey } from "@/lib/phone";
import type { Customer, Establishment } from "@/lib/fideo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Result = { prenom: string; telephone: string; token: string; existing: boolean };

export function CardLinkDialog(props: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  merchantId?: string | undefined;
  merchantName: string;
  employeeId: string | null;
  establishments: Establishment[];
  customers: Customer[];
  shareMessage: (prenom: string, link: string) => string;
}) {
  const qc = useQueryClient();
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [tel, setTel] = useState("");
  const [est, setEst] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!est && props.establishments[0]) setEst(props.establishments[0].id);
  }, [props.establishments, est]);

  const reset = () => { setPrenom(""); setNom(""); setTel(""); setResult(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = prenom.trim(), n = nom.trim();
    const phone = normalizePhone(tel);
    if (!p || !n) { toast.error("Prénom et nom obligatoires"); return; }
    if (p.length > 60 || n.length > 60) { toast.error("Nom trop long"); return; }
    if (!phone) { toast.error("Numéro invalide", { description: "Ex. 06 12 34 56 78 ou +41 79 123 45 67" }); return; }
    if (!props.merchantId) { return; }
    setBusy(true);
    try {
      const key = phoneKey(phone);
      const found = props.customers.find((c) => c.telephone && phoneKey(c.telephone) === key);
      if (found?.share_token) {
        setResult({ prenom: found.prenom ?? p, telephone: found.telephone ?? phone, token: found.share_token, existing: true });
        return;
      }
      const { data, error } = await supabase
        .from("customers")
        .insert({
          merchant_id: props.merchantId,
          establishment_id: est || null,
          employee_id: props.employeeId,
          prenom: p,
          nom: n,
          telephone: phone,
        })
        .select("share_token")
        .single();
      if (error) throw error;
      void qc.invalidateQueries({ queryKey: ["customers"] });
      setResult({ prenom: p, telephone: phone, token: data.share_token, existing: false });
    } catch {
      toast.error("Impossible de créer le client");
    } finally {
      setBusy(false);
    }
  };

  const link = result ? `https://fideoloyalty.app/c/${result.token}` : "";
  const msg = result ? props.shareMessage(result.prenom, link) : "";
  const wa = result ? `33${result.telephone.replace(/\D/g, "").slice(-9)}` : "";

  return (
    <Dialog open={props.open} onOpenChange={(o) => { props.onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{result ? (result.existing ? "Client déjà existant" : "Lien prêt") : "Créer un lien carte"}</DialogTitle>
          <DialogDescription>
            {result
              ? result.existing ? "Client déjà existant, voici son lien." : "Envoyez ce lien au client pour qu'il ajoute sa carte."
              : `Envoyez à distance une carte ${props.merchantName} à un client.`}
          </DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="space-y-3">
            <p className="break-all rounded-xl border border-border bg-secondary p-4 text-base font-semibold" data-testid="card-link">{link}</p>
            <Button className="h-12 w-full" onClick={async () => { await navigator.clipboard.writeText(link); toast.success("Lien copié"); }}>
              <Copy className="mr-2 h-4 w-4" /> Copier le lien
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-12" asChild>
                <a href={`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                </a>
              </Button>
              <Button variant="outline" className="h-12" asChild>
                <a href={`sms:${result.telephone}?&body=${encodeURIComponent(msg)}`}>
                  <MessageCircle className="mr-2 h-4 w-4" /> SMS
                </a>
              </Button>
            </div>
            <Button variant="ghost" className="w-full" onClick={reset}>
              <Plus className="mr-2 h-4 w-4" /> Créer un autre lien
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="cl-prenom">Prénom</Label>
              <Input id="cl-prenom" autoComplete="off" value={prenom} onChange={(e) => setPrenom(e.target.value)} required /></div>
            <div className="space-y-1.5"><Label htmlFor="cl-nom">Nom</Label>
              <Input id="cl-nom" autoComplete="off" value={nom} onChange={(e) => setNom(e.target.value)} required /></div>
            <div className="space-y-1.5"><Label htmlFor="cl-tel">Téléphone</Label>
              <Input id="cl-tel" type="tel" inputMode="tel" placeholder="06 12 34 56 78" value={tel} onChange={(e) => setTel(e.target.value)} required /></div>
            {props.establishments.length > 1 && (
              <div className="space-y-1.5"><Label htmlFor="cl-est">Établissement</Label>
                <select id="cl-est" value={est} onChange={(e) => setEst(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {props.establishments.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
                </select></div>
            )}
            <Button type="submit" className="h-12 w-full" disabled={busy}>{busy ? "Création…" : "Générer le lien"}</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
