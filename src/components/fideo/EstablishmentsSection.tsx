import { useEffect, useState } from "react";
import { Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEstablishments } from "@/lib/fideo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrImage } from "@/components/fideo/QrImage";

export function EstablishmentsSection({ merchantId }: { merchantId?: string | undefined }) {
  const { data: establishments } = useEstablishments(merchantId);
  const qc = useQueryClient();
  const [origin, setOrigin] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { nom: string; adresse: string }>>({});
  const [newNom, setNewNom] = useState("");
  const [newAdresse, setNewAdresse] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);

  useEffect(() => {
    if (!establishments) return;
    setDrafts(
      Object.fromEntries(
        establishments.map((e) => [e.id, { nom: e.nom, adresse: e.adresse ?? "" }]),
      ),
    );
  }, [establishments]);

  const refresh = () => void qc.invalidateQueries({ queryKey: ["establishments"] });

  const save = async (id: string) => {
    const d = drafts[id];
    if (!d || !d.nom.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    const { error } = await supabase
      .from("establishments")
      .update({ nom: d.nom.trim(), adresse: d.adresse.trim() || null })
      .eq("id", id);
    if (error) {
      toast.error("Enregistrement impossible", { description: error.message });
      return;
    }
    toast.success("Établissement mis à jour");
    refresh();
  };

  const add = async () => {
    if (!merchantId || !newNom.trim()) {
      toast.error("Nom de l'établissement requis");
      return;
    }
    const { error } = await supabase.from("establishments").insert({
      merchant_id: merchantId,
      nom: newNom.trim(),
      adresse: newAdresse.trim() || null,
    });
    if (error) {
      toast.error("Ajout impossible", { description: error.message });
      return;
    }
    setNewNom("");
    setNewAdresse("");
    toast.success("Établissement ajouté");
    refresh();
  };

  const download = (url: string, nom: string) => {
    void import("qrcode").then(async (m) => {
      const data = await m.toDataURL(url, { width: 1024, margin: 2 });
      const a = document.createElement("a");
      a.href = data;
      a.download = `qr-${nom.replace(/\s+/g, "-").toLowerCase()}.png`;
      a.click();
    });
  };

  return (
    <section className="animate-rise rounded-2xl border border-border bg-card p-5 shadow-soft">
      <h2 className="text-base font-bold">Établissements</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Modifiez le nom et l'adresse de vos points de vente. Imprimez le QR code fixe et posez-le sur
        le comptoir : chaque nouveau client s'inscrit seul en 10 secondes.
      </p>

      <ul className="mt-4 space-y-4">
        {(establishments ?? []).map((e) => {
          const url = `${origin}/rejoindre/${e.public_code}`;
          const d = drafts[e.id] ?? { nom: e.nom, adresse: e.adresse ?? "" };
          return (
            <li key={e.id} className="rounded-xl bg-secondary p-4">
              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Nom de l'établissement</Label>
                    <Input
                      value={d.nom}
                      onChange={(ev) =>
                        setDrafts((s) => ({ ...s, [e.id]: { ...d, nom: ev.target.value } }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Adresse</Label>
                    <Input
                      value={d.adresse}
                      onChange={(ev) =>
                        setDrafts((s) => ({ ...s, [e.id]: { ...d, adresse: ev.target.value } }))
                      }
                      placeholder="12 rue des Lilas, 50000 Saint-Lô"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" onClick={() => save(e.id)}>
                      Enregistrer
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => download(url, e.nom)}>
                      <Download className="mr-1 h-4 w-4" /> QR code
                    </Button>
                  </div>
                  <p className="break-all text-[11px] text-muted-foreground">{url}</p>
                </div>
                <div className="h-fit rounded-xl bg-white p-2">
                  <QrImage value={url} size={128} alt={`QR code ${e.nom}`} />
                </div>
              </div>
            </li>
          );
        })}
        {(establishments ?? []).length === 0 && (
          <li className="text-xs text-muted-foreground">Aucun établissement.</li>
        )}
      </ul>

      <div className="mt-5 grid gap-3 border-t border-border pt-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Nouvel établissement</Label>
          <Input value={newNom} onChange={(e) => setNewNom(e.target.value)} placeholder="Boutique centre-ville" />
        </div>
        <div className="space-y-2">
          <Label>Adresse</Label>
          <Input
            value={newAdresse}
            onChange={(e) => setNewAdresse(e.target.value)}
            placeholder="12 rue des Lilas, 50000 Saint-Lô"
          />
        </div>
        <div>
          <Button variant="outline" onClick={add}>
            <Plus className="mr-1 h-4 w-4" /> Ajouter
          </Button>
        </div>
      </div>
    </section>
  );
}
