import { afterEach, describe, expect, it } from "vitest";

import { branding } from "@/lib/config";
import { applyBrandingTheme, hexToOklchTriple } from "@/lib/theme";

describe("hexToOklchTriple", () => {
  it("converts a six-digit hex color to an OKLCH triple", () => {
    const triple = hexToOklchTriple("#1e3a5f");
    expect(triple).not.toBeNull();
    expect(triple).toMatch(/^[\d.]+ [\d.]+ [\d.]+$/);
  });

  it("expands three-digit shorthand", () => {
    expect(hexToOklchTriple("#fff")).toBe(hexToOklchTriple("#ffffff"));
  });

  it("returns null for a malformed color", () => {
    expect(hexToOklchTriple("not-a-color")).toBeNull();
    expect(hexToOklchTriple("#12345")).toBeNull();
  });
});

describe("applyBrandingTheme", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("style");
  });

  it("writes the branding colors onto the document root as custom properties", () => {
    applyBrandingTheme();
    const root = document.documentElement;
    expect(root.style.getPropertyValue("--primary")).toBe(
      hexToOklchTriple(branding.primaryColor),
    );
    expect(root.style.getPropertyValue("--accent")).toBe(
      hexToOklchTriple(branding.accentColor),
    );
    expect(root.style.getPropertyValue("--ring")).toBe(
      hexToOklchTriple(branding.primaryColor),
    );
  });
});
