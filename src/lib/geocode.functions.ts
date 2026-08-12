import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Géocode l'adresse d'un établissement du commerçant connecté et stocke lat/long. */
export const geocoderEtablissement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { establishment_id: string }) => {
    const id = String(input?.establishment_id ?? "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Établissement invalide");
    return { establishment_id: id };
  })
  .handler(async ({ data, context }) => {
    // RLS : l'établissement doit être visible par l'appelant.
    const { data: est } = await context.supabase
      .from("establishments")
      .select("id")
      .eq("id", data.establishment_id)
      .maybeSingle();
    if (!est) return { geocoded: false as const };

    const { geocodeAndStoreEstablishment } = await import("@/lib/geocode.server");
    const point = await geocodeAndStoreEstablishment(data.establishment_id);
    return point ? { geocoded: true as const, ...point } : { geocoded: false as const };
  });
