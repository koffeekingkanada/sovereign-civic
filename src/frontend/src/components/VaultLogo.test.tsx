import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { VaultLogo } from "@/components/VaultLogo";

/**
 * Characterization baseline for the emblem component's accessibility contract.
 * The accepted change replaces the vault-door drawing with a flat round SCS
 * badge, but the component's public seam must survive that edit: a supplied
 * `title` makes it a labelled image, and an omitted `title` makes it a
 * decorative, screen-reader-hidden mark. The drawing itself is deliberately
 * NOT frozen here — the accepted request intentionally changes it.
 */
describe("VaultLogo accessibility contract", () => {
  it("exposes a labelled image when a title is supplied", () => {
    render(<VaultLogo title="Demo Organization emblem" />);

    const emblem = screen.getByRole("img", {
      name: "Demo Organization emblem",
    });
    expect(emblem).toBeInTheDocument();
    expect(emblem).not.toHaveAttribute("aria-hidden");
  });

  it("is decorative and hidden from assistive technology without a title", () => {
    const { container } = render(<VaultLogo />);

    const svg = container.querySelector("svg") as SVGElement;
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("honours the requested size for both dimensions", () => {
    const { container } = render(<VaultLogo size={36} />);

    const svg = container.querySelector("svg") as SVGElement;
    expect(svg.getAttribute("width")).toBe("36");
    expect(svg.getAttribute("height")).toBe("36");
  });
});
