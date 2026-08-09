import { supabase } from "@/integrations/supabase/client";

/** Envoie une image dans le bucket `logos` et renvoie une URL signée longue durée. */
export async function uploadImage(file: File, prefix: "logo" | "photo"): Promise<string> {
  const { data: session } = await supabase.auth.getUser();
  const uid = session.user?.id;
  if (!uid) throw new Error("Session expirée");
  if (file.size > 5 * 1024 * 1024) throw new Error("Image trop lourde (5 Mo max)");
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${uid}/${prefix}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("logos")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message);
  const { data: signed, error: e2 } = await supabase.storage
    .from("logos")
    .createSignedUrl(path, 60 * 60 * 24 * 3650);
  if (e2 || !signed) throw new Error("Lien de l'image indisponible");
  return signed.signedUrl;
}

export const CARD_PALETTE = [
  "#6C5DD3",
  "#7C3AED",
  "#111827",
  "#0F766E",
  "#B45309",
  "#BE123C",
  "#1D4ED8",
  "#4D7C0F",
];

export const SECTEURS = [
  "Restaurant",
  "Café / Salon de thé",
  "Boulangerie / Pâtisserie",
  "Coiffure / Beauté",
  "Commerce de détail",
  "Garage / Mobilité",
  "Sport / Bien-être",
  "Autre",
];
