import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrImage({
  value,
  size = 200,
  className,
  alt = "QR code",
}: {
  value: string;
  size?: number;
  className?: string;
  alt?: string;
}) {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1,
      color: { dark: "#1a1024", light: "#ffffff" },
    }).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!src) {
    return (
      <div
        className={className}
        style={{ width: size, height: size, borderRadius: 12, background: "rgba(0,0,0,0.06)" }}
        aria-hidden
      />
    );
  }
  return <img src={src} alt={alt} width={size} height={size} className={className} />;
}
