/**
 * Pont entre l'app web Fidéo et sa version native iOS (Capacitor).
 * Tout ce fichier est sûr côté navigateur : chaque API native est chargée
 * dynamiquement et seulement quand l'app tourne réellement dans le conteneur natif.
 */

/** Base d'URL du serveur Fidéo utilisée par l'app native (vide sur le web). */
export const API_BASE_URL =
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined)?.replace(/\/$/, "") ?? "";

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

function capacitorGlobal(): CapacitorGlobal | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/** Vrai uniquement dans l'app iOS/Android installée, jamais dans un navigateur. */
export function isNative(): boolean {
  return capacitorGlobal()?.isNativePlatform?.() === true;
}

export function nativePlatform(): string {
  return capacitorGlobal()?.getPlatform?.() ?? "web";
}

export function isNativeIos(): boolean {
  return isNative() && nativePlatform() === "ios";
}

/* -------------------------------------------------------------------------- */
/*  Réseau : les appels serveur de l'app native pointent vers fideoloyalty.app  */
/* -------------------------------------------------------------------------- */

const SERVER_PREFIXES = ["/_serverFn", "/_server", "/api/"];

let fetchPatched = false;

/** Redirige les appels serveur relatifs vers le backend Fidéo hébergé. */
export function installNativeApiBridge(): void {
  if (fetchPatched || typeof window === "undefined") return;
  if (!isNative() || !API_BASE_URL) return;
  fetchPatched = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const path = url.startsWith("http")
        ? new URL(url).origin === window.location.origin
          ? new URL(url).pathname + new URL(url).search
          : null
        : url.startsWith("/")
          ? url
          : null;

      if (path && SERVER_PREFIXES.some((p) => path.startsWith(p))) {
        const target = `${API_BASE_URL}${path}`;
        if (typeof input === "string" || input instanceof URL) {
          return originalFetch(target, { credentials: "omit", ...init });
        }
        return originalFetch(new Request(target, input), init);
      }
    } catch {
      /* on retombe sur le fetch d'origine */
    }
    return originalFetch(input as RequestInfo, init);
  };
}

/* -------------------------------------------------------------------------- */
/*  Caméra / scan de QR code natif                                             */
/* -------------------------------------------------------------------------- */

/** Demande l'accès caméra via le plugin natif (dialogue système iOS). */
export async function ensureNativeCameraPermission(): Promise<boolean> {
  if (!isNative()) return true;
  const { Camera } = await import("@capacitor/camera");
  const status = await Camera.checkPermissions();
  if (status.camera === "granted") return true;
  const asked = await Camera.requestPermissions({ permissions: ["camera"] });
  return asked.camera === "granted";
}

/**
 * Ouvre le scanner de QR code natif d'iOS.
 * Renvoie le contenu scanné, ou null si l'utilisateur annule.
 */
export async function scanQrNative(): Promise<string | null> {
  const granted = await ensureNativeCameraPermission();
  if (!granted) throw new Error("Autorisez l'accès à la caméra dans les réglages de l'iPhone.");

  const { CapacitorBarcodeScanner, CapacitorBarcodeScannerTypeHint } = await import(
    "@capacitor/barcode-scanner"
  );
  const result = await CapacitorBarcodeScanner.scanBarcode({
    hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
    scanInstructions: "Placez le QR code du client dans le cadre",
    scanButton: false,
    cameraDirection: 1,
  });
  return result.ScanResult?.trim() ? result.ScanResult.trim() : null;
}

/** Petite vibration de confirmation après un scan réussi. */
export async function hapticSuccess(): Promise<void> {
  if (!isNative()) return;
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    /* non bloquant */
  }
}

/** Partage natif (feuille de partage iOS). */
export async function shareNative(options: {
  title?: string;
  text?: string;
  url?: string;
}): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { Share } = await import("@capacitor/share");
    await Share.share({ ...options, ...(options.title ? { dialogTitle: options.title } : {}) });
    return true;
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/*  Notifications push natives (APNs via Capacitor)                            */
/* -------------------------------------------------------------------------- */

export type NativePushResult = { token: string };

/**
 * Demande l'autorisation puis enregistre l'appareil auprès d'APNs.
 * Résout avec le jeton de l'appareil, à enregistrer côté serveur.
 */
export function registerNativePush(): Promise<NativePushResult> {
  return new Promise((resolve, reject) => {
    void (async () => {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        let perm = await PushNotifications.checkPermissions();
        if (perm.receive !== "granted") perm = await PushNotifications.requestPermissions();
        if (perm.receive !== "granted") {
          reject(new Error("permission-denied"));
          return;
        }

        const ok = await PushNotifications.addListener("registration", (token) => {
          void ok.remove();
          void ko.remove();
          resolve({ token: token.value });
        });
        const ko = await PushNotifications.addListener("registrationError", (err) => {
          void ok.remove();
          void ko.remove();
          reject(new Error(String(err?.error ?? "registration-error")));
        });

        await PushNotifications.register();
      } catch (e) {
        reject(e instanceof Error ? e : new Error("push-unavailable"));
      }
    })();
  });
}

/** Retire l'appareil des notifications natives. */
export async function unregisterNativePush(): Promise<void> {
  if (!isNative()) return;
  const { PushNotifications } = await import("@capacitor/push-notifications");
  await PushNotifications.removeAllListeners();
  await PushNotifications.unregister();
}
