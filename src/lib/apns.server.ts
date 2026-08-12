// Server-only : envoi de notifications APNs "pass update" (token auth ES256).
const APNS_HOST = "https://api.push.apple.com/3/device/";

function b64url(bytes: Uint8Array | string): string {
  const s = typeof bytes === "string" ? bytes : String.fromCharCode(...Array.from(bytes));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function apnsJwt(keyP8: string, keyId: string, teamId: string): Promise<string> {
  const body = keyP8
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der.buffer as ArrayBuffer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const header = b64url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const payload = b64url(JSON.stringify({ iss: teamId, iat: Math.floor(Date.now() / 1000) }));
  const sig = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      new TextEncoder().encode(`${header}.${payload}`),
    ),
  );
  return `${header}.${payload}.${b64url(sig)}`;
}

/**
 * Prévient tous les iPhone ayant enregistré le pass qu'une mise à jour est disponible.
 * No-op silencieux tant que la clé APNs (.p8) n'est pas configurée.
 */
export async function pushApplePassUpdate(serialNumber: string): Promise<number> {
  const keyP8 = process.env["APPLE_APNS_KEY_P8"];
  const keyId = process.env["APPLE_APNS_KEY_ID"];
  const teamId = process.env["APPLE_TEAM_ID"] ?? "QBR5LW4N8A";
  if (!keyP8 || !keyId) {
    console.log("[APNs] serial", serialNumber, "regs", 0, "keyPresent", false);
    return 0;
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: regs } = await supabaseAdmin
    .from("apple_pass_registrations")
    .select("push_token")
    .eq("serial_number", serialNumber);
  console.log("[APNs] serial", serialNumber, "regs", regs?.length, "keyPresent", Boolean(keyP8 && keyId));
  if (!regs?.length) return 0;

  const jwt = await apnsJwt(keyP8, keyId, teamId);
  let sent = 0;
  for (const reg of regs) {
    try {
      const res = await fetch(`${APNS_HOST}${reg.push_token}`, {
        method: "POST",
        headers: {
          authorization: `bearer ${jwt}`,
          "apns-topic": "pass.app.fideoloyalty.card",
          "apns-push-type": "background",
          "content-type": "application/json",
        },
        body: "{}",
      });
      if (res.ok) sent += 1;
      else
        console.error(
          "[APNs] échec",
          res.status,
          await res.text(),
          "topic=pass.app.fideoloyalty.card",
        );
    } catch (e) {
      console.error("[APNs] exception", e);
    }
  }
  return sent;
}