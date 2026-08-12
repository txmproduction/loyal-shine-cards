// Server-only : décodage / redimensionnement / encodage PNG en JavaScript pur.
// `sharp` n'est pas utilisable ici (runtime edge sans binaire natif), donc tout
// est fait en JS : PNG et JPEG sont décodés localement, les autres formats
// (WebP, AVIF, HEIC…) passent par un convertisseur d'images distant.
import { unzlibSync, zlibSync } from "fflate";

export type Bitmap = { width: number; height: number; data: Uint8Array };

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = CRC_TABLE[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u32(value: number): Uint8Array {
  return new Uint8Array([(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255]);
}

function chunk(type: string, body: Uint8Array): Uint8Array {
  const name = new Uint8Array([...type].map((c) => c.charCodeAt(0)));
  const payload = new Uint8Array(name.length + body.length);
  payload.set(name, 0);
  payload.set(body, name.length);
  const out = new Uint8Array(12 + body.length);
  out.set(u32(body.length), 0);
  out.set(payload, 4);
  out.set(u32(crc32(payload)), 8 + body.length);
  return out;
}

export function isPng(bytes: Uint8Array): boolean {
  return bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e;
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

/** Décodeur PNG minimal (profondeur 8/16, non entrelacé, tous types de couleur). */
function decodePng(bytes: Uint8Array): Bitmap {
  let pos = 8;
  let width = 0;
  let height = 0;
  let depth = 8;
  let colorType = 6;
  let interlace = 0;
  let palette: Uint8Array | null = null;
  let alphaPalette: Uint8Array | null = null;
  const idat: Uint8Array[] = [];

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  while (pos + 8 <= bytes.length) {
    const len = view.getUint32(pos);
    const type = String.fromCharCode(bytes[pos + 4]!, bytes[pos + 5]!, bytes[pos + 6]!, bytes[pos + 7]!);
    const body = bytes.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = view.getUint32(pos + 8);
      height = view.getUint32(pos + 12);
      depth = bytes[pos + 16]!;
      colorType = bytes[pos + 17]!;
      interlace = bytes[pos + 20]!;
    } else if (type === "PLTE") palette = body.slice();
    else if (type === "tRNS") alphaPalette = body.slice();
    else if (type === "IDAT") idat.push(body.slice());
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  if (!width || !height) throw new Error("PNG illisible");
  if (interlace !== 0) throw new Error("PNG entrelacé non supporté");
  if (depth !== 8 && depth !== 16) throw new Error("Profondeur PNG non supportée");

  const merged = new Uint8Array(idat.reduce((n, c) => n + c.length, 0));
  let off = 0;
  for (const c of idat) {
    merged.set(c, off);
    off += c.length;
  }
  const raw = unzlibSync(merged);

  const channels = colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 3 ? 1 : colorType === 4 ? 2 : 4;
  const sampleBytes = depth === 16 ? 2 : 1;
  const bpp = channels * sampleBytes;
  const stride = width * bpp;
  const lines = new Uint8Array(height * stride);

  let src = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[src]!;
    src += 1;
    const rowStart = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const rawByte = raw[src + x]!;
      const a = x >= bpp ? lines[rowStart + x - bpp]! : 0;
      const b = y > 0 ? lines[rowStart - stride + x]! : 0;
      const c = x >= bpp && y > 0 ? lines[rowStart - stride + x - bpp]! : 0;
      let value = rawByte;
      if (filter === 1) value = rawByte + a;
      else if (filter === 2) value = rawByte + b;
      else if (filter === 3) value = rawByte + ((a + b) >> 1);
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        value = rawByte + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      }
      lines[rowStart + x] = value & 0xff;
    }
    src += stride;
  }

  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const s = y * stride + x * bpp;
      const d = (y * width + x) * 4;
      const at = (i: number) => lines[s + i * sampleBytes]!;
      if (colorType === 0) {
        const g = at(0);
        data[d] = g;
        data[d + 1] = g;
        data[d + 2] = g;
        data[d + 3] = 255;
      } else if (colorType === 2) {
        data[d] = at(0);
        data[d + 1] = at(1);
        data[d + 2] = at(2);
        data[d + 3] = 255;
      } else if (colorType === 3 && palette) {
        const idx = at(0);
        data[d] = palette[idx * 3] ?? 0;
        data[d + 1] = palette[idx * 3 + 1] ?? 0;
        data[d + 2] = palette[idx * 3 + 2] ?? 0;
        data[d + 3] = alphaPalette?.[idx] ?? 255;
      } else if (colorType === 4) {
        const g = at(0);
        data[d] = g;
        data[d + 1] = g;
        data[d + 2] = g;
        data[d + 3] = at(1);
      } else {
        data[d] = at(0);
        data[d + 1] = at(1);
        data[d + 2] = at(2);
        data[d + 3] = at(3);
      }
    }
  }
  return { width, height, data };
}

async function decodeJpeg(bytes: Uint8Array): Promise<Bitmap> {
  const jpeg = await import("jpeg-js");
  const decoded = (jpeg.default ?? jpeg).decode(bytes, { useTArray: true, formatAsRGBA: true });
  return {
    width: decoded.width,
    height: decoded.height,
    data: new Uint8Array(decoded.data.buffer ?? decoded.data),
  };
}

/** Convertisseur distant, utilisé seulement pour les formats non décodables ici (WebP, AVIF…). */
async function remoteToPng(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(
      `https://images.weserv.nl/?url=${encodeURIComponent(url)}&output=png&n=-1`,
    );
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    return isPng(bytes) ? bytes : null;
  } catch {
    return null;
  }
}

export async function decodeImage(bytes: Uint8Array, sourceUrl?: string): Promise<Bitmap | null> {
  try {
    if (isPng(bytes)) return decodePng(bytes);
    if (isJpeg(bytes)) return await decodeJpeg(bytes);
  } catch {
    /* on tente la conversion distante ci-dessous */
  }
  if (sourceUrl) {
    const png = await remoteToPng(sourceUrl);
    if (png) {
      try {
        return decodePng(png);
      } catch {
        return null;
      }
    }
  }
  return null;
}

function samplePixel(src: Bitmap, sx: number, sy: number, out: Uint8Array, d: number) {
  const x = Math.min(src.width - 1, Math.max(0, Math.round(sx)));
  const y = Math.min(src.height - 1, Math.max(0, Math.round(sy)));
  const s = (y * src.width + x) * 4;
  out[d] = src.data[s]!;
  out[d + 1] = src.data[s + 1]!;
  out[d + 2] = src.data[s + 2]!;
  out[d + 3] = src.data[s + 3]!;
}

/** Redimensionne en remplissant tout le cadre (recadrage centré). */
export function resizeCover(src: Bitmap, width: number, height: number): Bitmap {
  const data = new Uint8Array(width * height * 4);
  const scale = Math.max(width / src.width, height / src.height);
  const drawW = src.width * scale;
  const drawH = src.height * scale;
  const offX = (drawW - width) / 2;
  const offY = (drawH - height) / 2;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      samplePixel(src, (x + offX) / scale, (y + offY) / scale, data, (y * width + x) * 4);
    }
  }
  return { width, height, data };
}

/** Redimensionne en conservant le ratio, centré sur un fond transparent. */
export function resizeContain(src: Bitmap, maxW: number, maxH: number): Bitmap {
  const scale = Math.min(maxW / src.width, maxH / src.height, 1e9);
  const drawW = Math.max(1, Math.round(src.width * scale));
  const drawH = Math.max(1, Math.round(src.height * scale));
  const data = new Uint8Array(maxW * maxH * 4);
  const offX = Math.floor((maxW - drawW) / 2);
  const offY = Math.floor((maxH - drawH) / 2);
  for (let y = 0; y < drawH; y += 1) {
    for (let x = 0; x < drawW; x += 1) {
      samplePixel(src, x / scale, y / scale, data, ((y + offY) * maxW + (x + offX)) * 4);
    }
  }
  return { width: maxW, height: maxH, data };
}

export function encodePng(bitmap: Bitmap): Uint8Array {
  const { width, height, data } = bitmap;
  const stride = width * 4;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    raw.set(data.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  const ihdr = new Uint8Array(13);
  ihdr.set(u32(width), 0);
  ihdr.set(u32(height), 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const idat = zlibSync(raw, { level: 6 });
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", new Uint8Array(0)),
  ];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

/** Télécharge une image (n'importe quel format) et la renvoie décodée en RGBA. */
export async function fetchBitmap(url: string | undefined): Promise<Bitmap | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await decodeImage(new Uint8Array(await res.arrayBuffer()), url);
  } catch {
    return null;
  }
}