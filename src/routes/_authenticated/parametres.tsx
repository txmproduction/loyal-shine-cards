import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { deleteMyAccount } from "@/lib/account.functions";
import { useEmployeeSelf, useMerchant } from "@/lib/fideo";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/parametres")({
  head: () => ({
    meta: [
      { title: "Paramètres du compte — Fidéo" },
      {
        name: "description",
        content:
          "Gérez votre compte Fidéo : informations de connexion et suppression définitive du compte.",
      },
      { property: "og:title", content: "Paramètres du compte — Fidéo" },
      {
        property: "og:description",
        content: "Gérez ou supprimez définitivement votre compte Fidéo.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: merchant } = useMerchant();
  const { data: employee } = useEmployeeSelf();
  const navigate = useNavigate();
  const remove = useServerFn(deleteMyAccount);
  const [loading, setLoading] = useState(false);

  const isEmployee = !!employee;

  const onDelete = async () => {
    setLoading(true);
    try {
      await remove({ data: undefined });
      await supabase.auth.signOut();
      toast.success("Votre compte a été supprimé définitivement.");
      void navigate({ to: "/auth", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Suppression impossible");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="font-display text-2xl font-bold">Paramètres du compte</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vos informations de connexion et la gestion de votre compte.
        </p>
      </header>

      <section className="rounded-2xl border border-border p-5">
        <h2 className="text-sm font-semibold">Mon compte</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Type de compte</dt>
            <dd className="font-medium">{isEmployee ? "Employé" : "Commerçant"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Commerce</dt>
            <dd className="font-medium">{merchant?.nom_commerce ?? "—"}</dd>
          </div>
          {isEmployee ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Nom</dt>
              <dd className="font-medium">{employee?.nom}</dd>
            </div>
          ) : (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">{merchant?.email ?? "—"}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="rounded-2xl border border-destructive/40 p-5">
        <h2 className="text-sm font-semibold text-destructive">Supprimer mon compte</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {isEmployee
            ? "Votre accès employé sera supprimé immédiatement et définitivement. Vous ne pourrez plus vous connecter."
            : "Votre compte, votre commerce, vos clients, leurs cartes de fidélité, l'historique des points et les accès de vos employés seront supprimés immédiatement et définitivement."}{" "}
          Cette action est irréversible.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="mt-4" disabled={loading}>
              <Trash2 className="mr-2 h-4 w-4" />
              {loading ? "Suppression…" : "Supprimer mon compte"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer définitivement votre compte ?</AlertDialogTitle>
              <AlertDialogDescription>
                Toutes vos données seront effacées immédiatement et ne pourront pas être
                récupérées.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => void onDelete()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Supprimer définitivement
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}
