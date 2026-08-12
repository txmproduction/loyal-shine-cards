// Server-only : géocodage d'adresses (Google Geocoding, fallback OpenStreetMap).

export type GeoPoint = { latitude: number; longitude: number };

async function geocodeGoogle(adresse: string, key: string): Promise<GeoPoint | null> {
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(adresse)}&key=${key}`,
  );
  if (!res.ok) {
    console.error("[Geocode] Google HTTP", res.status);
    return null;
  }
  const json = (await res.json()) as {
    status?: string;
    results?: Array<{ geometry?: { location?: { lat: number; lng: number } } }>;
  };
  const loc = json.results?.[0]?.geometry?.location;
  if (!loc) {
    console.error("[Geocode] Google status", json.status);
    return null;
  }
  return { latitude: loc.lat, longitude: loc.lng };
}

async function geocodeOsm(adresse: string): Promise<GeoPoint | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(adresse)}`,
    { headers: { "user-agent": "Fideo/1.0 (loyalty cards)" } },
  );
  if (!res.ok) {
    console.error("[Geocode] OSM HTTP", res.status);
    return null;
  }
  const json = (await res.json()) as Array<{ lat?: string; lon?: string }>;
  const first = json[0];
  if (!first?.lat || !first.lon) return null;
  return { latitude: Number(first.lat), longitude: Number(first.lon) };
}

/** Renvoie les coordonnées d'une adresse, ou null si vide / introuvable (jamais bloquant). */
export async function geocodeAddress(adresse: string | null | undefined): Promise<GeoPoint | null> {
  const q = (adresse ?? "").trim();
  if (q.length < 4) return null;
  const key = process.env["GOOGLE_PLACES_API_KEY"] ?? process.env["GOOGLE_MAPS_API_KEY"];
  try {
    const point = key ? await geocodeGoogle(q, key) : await geocodeOsm(q);
    if (point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude)) return point;
    return null;
  } catch (e) {
    console.error("[Geocode] échec", e);
    return null;
  }
}

/** Géocode un établissement et stocke le résultat. Renvoie le point ou null. */
export async function geocodeAndStoreEstablishment(
  establishmentId: string,
): Promise<GeoPoint | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: est } = await supabaseAdmin
    .from("establishments")
    .select("id, adresse")
    .eq("id", establishmentId)
    .maybeSingle();
  if (!est) return null;
  const point = await geocodeAddress(est.adresse);
  if (!point) return null;
  await supabaseAdmin
    .from("establishments")
    .update({ latitude: point.latitude, longitude: point.longitude })
    .eq("id", establishmentId);
  return point;
}
