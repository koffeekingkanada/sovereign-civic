import { describe, expect, it } from "vitest";

import { branding } from "@/lib/config";

describe("branding config", () => {
  it("exposes the accepted default branding values", () => {
    expect(branding.organizationName).toBe("Demo Organization");
    expect(branding.primaryColor).toBe("#1e3a5f");
    expect(branding.accentColor).toBe("#c8a04e");
    expect(branding.logoPath).toBe("/logo.png");
  });

  it("no longer carries a province identity field", () => {
    // The accepted change removes the province/government identity from the
    // branding surface entirely.
    expect("provinceName" in branding).toBe(false);
  });

  it("carries the accepted tagline", () => {
    expect(branding.tagline).toBe("Sovereign communication infrastructure.");
  });

  it("uses valid hex colors so the theme can derive from them", () => {
    expect(branding.primaryColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(branding.accentColor).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});
