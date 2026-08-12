// Server-only : génération et signature de fichiers .pkpass Apple Wallet.
import forge from "node-forge";
import { zipSync, strToU8 } from "fflate";
import { APPLE_WWDR_G4_PEM } from "./apple-wwdr.server";
import { DEFAULT_PASS_ICON_BASE64 } from "./apple-pass-icon.server";
import type { WalletCardInput } from "./google-wallet.server";

export const PASS_TYPE_IDENTIFIER = "pass.app.fideoloyalty.card";
export const APPLE_TEAM_ID = "QBR5LW4N8A";
export const APPLE_ORGANIZATION = "TXM Production";

function hexToRgb(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "rgb(124,58,237)";
  const n = parseInt(m[1]!, 16);
  return `rgb(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255})`;
}

function binaryToBytes(binary: string): Uint8Array {
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i) & 0xff;
  return out;
}

function bytesToBinary(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]!);
  return s;
}

type Signer = { key: forge.pki.PrivateKey; certificate: forge.pki.Certificate };

let cachedSigner: Signer | undefined;

/** Charge le certificat Pass Type ID (.p12) fourni par Apple. */
function loadSigner(): Signer {
  if (cachedSigner) return cachedSigner;
  const b64 = process.env["APPLE_PASS_P12_BASE64"];
  const password = process.env["APPLE_PASS_P12_PASSWORD"] ?? "";
  if (!b64) throw new Error("Certificat Apple Wallet non configuré (APPLE_PASS_P12_BASE64).");

  const p12Der = forge.util.decode64(b64);
  const p12Asn1 = forge.asn1.fromDer(p12Der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

  const keyBags = {
    ...p12.getBags({ bagType: forge.pki.oids['pkcs8ShroudedKeyBag']! }),
    ...p12.getBags({ bagType: forge.pki.oids['keyBag']! }),
  } as Record<string, forge.pkcs12.Bag[] | undefined>;
  const key = Object.values(keyBags)
    .flatMap((bags) => bags ?? [])
    .map((bag) => bag.key)
    .find(Boolean);
  const certificate = Object.values(
    p12.getBags({ bagType: forge.pki.oids['certBag']! }) as Record<string, forge.pkcs12.Bag[]>,
  )
    .flatMap((bags) => bags ?? [])
    .map((bag) => bag.cert)
    .find((cert) => cert?.subject.getField("OU")?.value === APPLE_TEAM_ID || Boolean(cert));

  if (!key || !certificate) {
    throw new Error("Certificat Apple invalide ou mot de passe .p12 incorrect.");
  }
  cachedSigner = { key, certificate };
  return cachedSigner;
}

/** Signature PKCS#7 détachée du manifest, exigée par Apple Wallet. */
function signManifest(manifest: string): Uint8Array {
  const { key, certificate } = loadSigner();
  const wwdr = forge.pki.certificateFromPem(APPLE_WWDR_G4_PEM.trim());

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(manifest, "utf8");
  p7.addCertificate(certificate);
  p7.addCertificate(wwdr);
  p7.addSigner({
    key: key as forge.pki.rsa.PrivateKey,
    certificate,
    digestAlgorithm: forge.pki.oids["sha256"]!,
    authenticatedAttributes: [
      { type: forge.pki.oids["contentType"]!, value: forge.pki.oids["data"]! },
      { type: forge.pki.oids["messageDigest"]! },
      { type: forge.pki.oids["signingTime"]!, value: new Date().toISOString() },
    ],
  });
  p7.sign({ detached: true });
  return binaryToBytes(forge.asn1.toDer(p7.toAsn1()).getBytes());
}

function sha1Hex(bytes: Uint8Array): string {
  const md = forge.md.sha1.create();
  md.update(bytesToBinary(bytes));
  return md.digest().toHex();
}

/** Télécharge une image distante uniquement si c'est bien un PNG (contrainte Apple). */
async function fetchPng(url: string | undefined): Promise<Uint8Array | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    const isPng =
      bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e;
    return isPng ? bytes : null;
  } catch {
    return null;
  }
}

/** Jeton d'authentification du pass (web service Apple), dérivé du numéro de série. */
export function passAuthToken(serialNumber: string): string {
  const secret = process.env["APPLE_PASS_AUTH_SECRET"] ?? "";
  const hmac = forge.hmac.create();
  hmac.start("sha256", secret);
  hmac.update(serialNumber);
  return hmac.digest().toHex();
}

export function buildPassJson(input: WalletCardInput, serialNumber: string, origin: string) {
  return {
    formatVersion: 1,
    passTypeIdentifier: PASS_TYPE_IDENTIFIER,
    teamIdentifier: APPLE_TEAM_ID,
    organizationName: APPLE_ORGANIZATION,
    serialNumber,
    description: input.programName,
    logoText: input.issuerName,
    backgroundColor: hexToRgb(input.backgroundColor),
    foregroundColor: "rgb(255,255,255)",
    labelColor: "rgba(255,255,255,0.75)",
    sharingProhibited: false,
    webServiceURL: `${origin}/api/public/passes/`,
    authenticationToken: passAuthToken(serialNumber),
    barcodes: [
      {
        format: "PKBARCODE_FORMAT_QR",
        message: input.barcodeValue,
        messageEncoding: "iso-8859-1",
        altText: input.accountName,
      },
    ],
    storeCard: {
      headerFields: [
        { key: "points", label: input.pointsLabel, value: input.pointsValue },
      ],
      primaryFields: [
        { key: "reward", label: "Récompense", value: input.rewardText },
      ],
      secondaryFields: [
        { key: "member", label: "Titulaire", value: input.accountName },
        ...(input.locationName
          ? [{ key: "place", label: "Établissement", value: input.locationName }]
          : []),
      ],
      auxiliaryFields: input.nextTierText
        ? [{ key: "tier", label: "Prochain palier", value: input.nextTierText }]
        : [],
      backFields: [
        { key: "program", label: "Programme", value: input.programName },
        { key: "card", label: "Numéro de carte", value: input.accountId },
        {
          key: "info",
          label: "Comment ça marche",
          value:
            "Présentez le QR code de cette carte à chaque passage. Votre solde se met à jour automatiquement.",
        },
      ],
    },
  };
}

/** Construit et signe le fichier .pkpass complet. */
export async function buildPkPass(
  input: WalletCardInput,
  serialNumber: string,
  origin: string,
): Promise<Uint8Array> {
  const icon =
    (await fetchPng(input.logoUrl)) ?? binaryToBytes(forge.util.decode64(DEFAULT_PASS_ICON_BASE64));
  const strip = await fetchPng(input.heroImageUrl);

  const files: Record<string, Uint8Array> = {
    "pass.json": strToU8(JSON.stringify(buildPassJson(input, serialNumber, origin))),
    "icon.png": icon,
    "icon@2x.png": icon,
    "logo.png": icon,
    "logo@2x.png": icon,
    ...(strip ? { "strip.png": strip, "strip@2x.png": strip } : {}),
  };

  const manifest: Record<string, string> = {};
  for (const [name, bytes] of Object.entries(files)) manifest[name] = sha1Hex(bytes);
  const manifestJson = JSON.stringify(manifest);

  return zipSync(
    {
      ...files,
      "manifest.json": strToU8(manifestJson),
      signature: signManifest(manifestJson),
    },
    { level: 6 },
  );
}