import { branding } from "@/lib/config";

/**
 * Convert a hex color string (#rgb or #rrggbb) into an OKLCH triple string
 * formatted as `L C H` with no wrapper, matching the CSS custom property
 * convention used in index.css (consumed via `oklch(var(--token))`).
 */
export function hexToOklchTriple(hex: string): string | null {
  const normalized = hex.trim().replace(/^#/, "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return null;

  const r = Number.parseInt(expanded.slice(0, 2), 16) / 255;
  const g = Number.parseInt(expanded.slice(2, 4), 16) / 255;
  const b = Number.parseInt(expanded.slice(4, 6), 16) / 255;

  const toLinear = (channel: number) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const lRoot = Math.cbrt(l);
  const mRoot = Math.cbrt(m);
  const sRoot = Math.cbrt(s);

  const lightness =
    0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot;
  const a = 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot;
  const bb = 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot;

  const chroma = Math.sqrt(a * a + bb * bb);
  let hue = (Math.atan2(bb, a) * 180) / Math.PI;
  if (hue < 0) hue += 360;

  const round = (value: number, digits: number) =>
    Number(value.toFixed(digits)).toString();

  return `${round(lightness, 3)} ${round(chroma, 3)} ${round(hue, 1)}`;
}

/**
 * Apply the branding config colors to the document root as OKLCH custom
 * properties. Called once on app mount so a reskin of config.ts takes effect
 * across every page without touching any other file.
 */
export function applyBrandingTheme(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  const primary = hexToOklchTriple(branding.primaryColor);
  if (primary) {
    root.style.setProperty("--primary", primary);
    root.style.setProperty("--ring", primary);
  }

  const accent = hexToOklchTriple(branding.accentColor);
  if (accent) {
    root.style.setProperty("--accent", accent);
    root.style.setProperty("--rule-gold", accent);
  }
}
