import { useEffect, useRef, useState } from "react";

/**
 * Lecteur de QR code via la caméra du téléphone (getUserMedia + html5-qrcode).
 * Monté uniquement côté client.
 */
export function QrScanner({
  onResult,
  onError,
}: {
  onResult: (text: string) => void;
  onError?: (message: string) => void;
}) {
  const containerId = useRef(`qr-reader-${Math.random().toString(36).slice(2)}`);
  const [status, setStatus] = useState("Démarrage de la caméra…");
  const handled = useRef(false);

  useEffect(() => {
    let scanner: { stop: () => Promise<void>; clear: () => void } | null = null;
    let stopped = false;

    void (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const instance = new Html5Qrcode(containerId.current, { verbose: false });
        scanner = instance as unknown as { stop: () => Promise<void>; clear: () => void };
        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            if (handled.current) return;
            handled.current = true;
            onResult(decoded);
          },
          () => undefined,
        );
        if (stopped) await instance.stop();
        setStatus("Placez le QR code du client dans le cadre");
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Caméra indisponible. Autorisez l'accès dans le navigateur.";
        setStatus(msg);
        onError?.(msg);
      }
    })();

    return () => {
      stopped = true;
      if (scanner) {
        void scanner
          .stop()
          .then(() => scanner?.clear())
          .catch(() => undefined);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-2">
      <div
        id={containerId.current}
        className="overflow-hidden rounded-2xl border border-border bg-black"
      />
      <p className="text-center text-xs text-muted-foreground">{status}</p>
    </div>
  );
}
