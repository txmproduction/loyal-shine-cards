// Server-only helpers pour Google Wallet (signature RS256 + API Wallet Objects).

const WALLET_API = "https://walletobjects.googleapis.com/walletobjects/v1";
const SCOPE = "https://www.googleapis.com/auth/wallet_object.issuer";

export type ServiceAccount = { client_email: string; private_key: string };

export function loadServiceAccount(): ServiceAccount {
  const raw = process.env["GOOGLE_WALLET_SERVICE_ACCOUNT"];
  if (!raw) throw new Error("GOOGLE_WALLET_SERVICE_ACCOUNT manquant");
  let parsed: ServiceAccount;
  try {
    parsed = JSON.parse(raw) as ServiceAccount;
  } catch {
    throw new Error("GOOGLE_WALLET_SERVICE_ACCOUNT n'est pas un JSON valide");
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("Service account incomplet (client_email / private_key)");
  }
  return { ...parsed, private_key: parsed.private_key.replace(/\\n/g, "\n") };
}

function base64url(bytes: Uint8Array | string): string {
  const str =
    typeof bytes === "string"
      ? bytes
      : String.fromCharCode(...Array.from(bytes));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importKey(pem: string): Promise<CryptoKey> {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    der.buffer as ArrayBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

export async function signJwtRs256(
  payload: Record<string, unknown>,
  account: ServiceAccount,
): Promise<string> {
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));
  const key = await importKey(account.private_key);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${body}`),
  );
  return `${header}.${body}.${base64url(new Uint8Array(signature))}`;
}

async function accessToken(account: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const assertion = await signJwtRs256(
    {
      iss: account.client_email,
      scope: SCOPE,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    },
    account,
  );
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const json = (await res.json()) as { access_token?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(`Authentification Google refusée: ${json.error_description ?? res.status}`);
  }
  return json.access_token;
}

async function walletFetch(
  token: string,
  path: string,
  method: "GET" | "POST" | "PUT",
  body?: unknown,
): Promise<{ ok: boolean; status: number; json: unknown }> {
  const res = await fetch(`${WALLET_API}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, json };
}

export type WalletCardInput = {
  classSuffix: string;
  objectSuffix: string;
  programName: string;
  issuerName: string;
  logoUrl: string;
  heroImageUrl?: string | undefined;
  backgroundColor: string;
  accountName: string;
  accountId: string;
  pointsLabel: string;
  pointsValue: string;
  rewardText: string;
  nextTierText?: string | undefined;
  barcodeValue: string;
  locationName?: string | undefined;
};

function buildLoyaltyObject(input: WalletCardInput, issuerId: string) {
  return {
    id: `${issuerId}.${input.objectSuffix}`,
    classId: `${issuerId}.${input.classSuffix}`,
    state: "ACTIVE",
    accountName: input.accountName,
    accountId: input.accountId,
    hexBackgroundColor: input.backgroundColor,
    ...(input.heroImageUrl
      ? {
          heroImage: {
            sourceUri: { uri: input.heroImageUrl },
            contentDescription: {
              defaultValue: { language: "fr", value: input.issuerName },
            },
          },
        }
      : {}),
    loyaltyPoints: {
      label: input.pointsLabel,
      balance: { string: input.pointsValue },
    },
    textModulesData: [
      { header: "Titulaire", body: input.accountName, id: "titulaire" },
      {
        header: "Prochain palier",
        body: input.nextTierText ?? input.rewardText,
        id: "palier",
      },
      { header: "Récompense", body: input.rewardText, id: "recompense" },
    ],
    barcode: { type: "QR_CODE", value: input.barcodeValue, alternateText: "" },
  };
}

/** Met uniquement à jour l'objet de fidélité existant (aucune classe ni JWT). */
export async function updateWalletObject(input: WalletCardInput): Promise<boolean> {
  const issuerId = process.env["GOOGLE_WALLET_ISSUER_ID"];
  if (!issuerId) throw new Error("GOOGLE_WALLET_ISSUER_ID manquant");
  const account = loadServiceAccount();
  const token = await accessToken(account);
  const objectId = `${issuerId}.${input.objectSuffix}`;

  const res = await walletFetch(
    token,
    `/loyaltyObject/${objectId}`,
    "PUT",
    buildLoyaltyObject(input, issuerId),
  );
  if (res.status === 404) return false;
  if (!res.ok) throw new Error(`Mise à jour de la carte Wallet impossible (${res.status})`);
  return true;
}

/** Crée/actualise la classe et l'objet de fidélité, puis renvoie l'URL "Save to Google Wallet". */
export async function buildSaveUrl(input: WalletCardInput, origin: string): Promise<string> {
  const issuerId = process.env["GOOGLE_WALLET_ISSUER_ID"];
  if (!issuerId) throw new Error("GOOGLE_WALLET_ISSUER_ID manquant");
  const account = loadServiceAccount();
  const token = await accessToken(account);

  const classId = `${issuerId}.${input.classSuffix}`;
  const objectId = `${issuerId}.${input.objectSuffix}`;

  const loyaltyClass = {
    id: classId,
    issuerName: input.issuerName,
    programName: input.programName,
    reviewStatus: "APPROVED",
    hexBackgroundColor: input.backgroundColor,
    programLogo: {
      sourceUri: { uri: input.logoUrl },
      contentDescription: { defaultValue: { language: "fr", value: input.programName } },
    },
    ...(input.heroImageUrl
      ? {
          heroImage: {
            sourceUri: { uri: input.heroImageUrl },
            contentDescription: {
              defaultValue: { language: "fr", value: input.issuerName },
            },
          },
        }
      : {}),
    localizedIssuerName: { defaultValue: { language: "fr", value: input.issuerName } },
    ...(input.locationName
      ? {
          textModulesData: [
            { header: "Établissement", body: input.locationName, id: "etablissement" },
          ],
        }
      : {}),
  };

  const existingClass = await walletFetch(token, `/loyaltyClass/${classId}`, "GET");
  if (existingClass.ok) {
    await walletFetch(token, `/loyaltyClass/${classId}`, "PUT", loyaltyClass);
  } else if (existingClass.status === 404) {
    const created = await walletFetch(token, `/loyaltyClass`, "POST", loyaltyClass);
    if (!created.ok) throw new Error(`Création de la classe Wallet impossible (${created.status})`);
  } else {
    throw new Error(`Google Wallet indisponible (${existingClass.status})`);
  }

  const loyaltyObject = buildLoyaltyObject(input, issuerId);
  const existingObject = await walletFetch(token, `/loyaltyObject/${objectId}`, "GET");
  if (existingObject.ok) {
    const updated = await walletFetch(token, `/loyaltyObject/${objectId}`, "PUT", loyaltyObject);
    if (!updated.ok) throw new Error(`Mise à jour de la carte Wallet impossible (${updated.status})`);
  } else if (existingObject.status === 404) {
    const created = await walletFetch(token, `/loyaltyObject`, "POST", loyaltyObject);
    if (!created.ok) throw new Error(`Création de la carte Wallet impossible (${created.status})`);
  } else {
    throw new Error(`Google Wallet indisponible (${existingObject.status})`);
  }

  const now = Math.floor(Date.now() / 1000);
  const saveJwt = await signJwtRs256(
    {
      iss: account.client_email,
      aud: "google",
      typ: "savetowallet",
      iat: now,
      origins: [origin],
      payload: { loyaltyObjects: [{ id: objectId, classId }] },
    },
    account,
  );

  return `https://pay.google.com/gp/v/save/${saveJwt}`;
}
