import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { VaultWheel } from "@/components/VaultWheel";

/**
 * Cover for the accepted feature-wheel change: the SCS badge sits at the centre
 * of the ring, the labelled circles are enlarged so their labels are not cut
 * off on phones, and a key under the wheel explains the solid "Available now"
 * and faded "Roadmap" states.
 *
 * jsdom performs no layout, so "no label is cut off on a phone" is covered
 * indirectly: the circles are sized as a percentage of the wheel and the label
 * is allowed to wrap, which is the mechanism that keeps the text inside the
 * circle. Real viewport measurement is out of scope here.
 */

const LIVE_LABELS = [
  "Directory",
  "Private Messaging",
  "Admin Approval",
  "Internet Identity",
  "Independent Nodes",
];

const ROADMAP_LABELS = [
  "Encryption",
  "Canadian Hosting",
  "File Sharing",
  "Documents",
  "Email",
];

describe("VaultWheel centre badge", () => {
  it("renders the SCS badge at the centre of the ring", () => {
    const { container } = render(<VaultWheel />);

    // The centre badge is the only decorative VaultLogo inside the wheel; it
    // carries the SCS monogram and paints in the navy and gold theme colours.
    const centre = container.querySelector(
      ".wheel-centre, [class*='size-\\[24%\\]']",
    ) as HTMLElement;
    expect(centre).not.toBeNull();

    const badge = centre.querySelector("svg") as SVGElement;
    expect(badge).not.toBeNull();
    expect(badge.textContent).toContain("SCS");
    expect(badge.outerHTML).toContain("oklch(var(--primary))");
    expect(badge.outerHTML).toContain("oklch(var(--accent))");
  });

  it("exposes the wheel as a labelled image", () => {
    render(<VaultWheel title="Demo Organization capabilities" />);
    expect(
      screen.getByRole("img", { name: "Demo Organization capabilities" }),
    ).toBeInTheDocument();
  });
});

describe("VaultWheel labelled circles", () => {
  it("renders every live and roadmap capability label", () => {
    const { container } = render(<VaultWheel />);
    const wheel = container.querySelector("[role='img']") as HTMLElement;

    for (const label of [...LIVE_LABELS, ...ROADMAP_LABELS]) {
      expect(within(wheel).getByText(label)).toBeInTheDocument();
    }
  });

  it("sizes the circles as a percentage of the wheel so labels fit on phones", () => {
    const { container } = render(<VaultWheel />);
    const wheel = container.querySelector("[role='img']") as HTMLElement;

    // Each labelled circle is a percentage-sized box, not a fixed pixel size,
    // so it scales with the wheel on a narrow viewport. The accepted change
    // enlarged the circles (32.4% -> 34%) so no label is cut off on phones.
    const node = within(wheel).getByText("Directory")
      .parentElement as HTMLElement;
    expect(node.className).toContain("size-[34%]");
    // The label is allowed to wrap rather than being clipped to one line.
    const label = within(wheel).getByText("Directory");
    expect(label.className).toContain("line-clamp-3");
    expect(label.className).toContain("break-words");
  });

  it("keeps the label text size unchanged while the circles grow", () => {
    const { container } = render(<VaultWheel />);
    const wheel = container.querySelector("[role='img']") as HTMLElement;

    // The accepted change enlarges only the circle; the label typography must
    // stay at its previous size so the words still fit inside.
    const node = within(wheel).getByText("Directory")
      .parentElement as HTMLElement;
    expect(node.className).toContain("text-[0.6rem]");
    expect(node.className).toContain("sm:text-[0.7rem]");
  });

  it("draws live circles solid and roadmap circles faded", () => {
    const { container } = render(<VaultWheel />);
    const wheel = container.querySelector("[role='img']") as HTMLElement;

    const live = within(wheel).getByText("Directory")
      .parentElement as HTMLElement;
    const roadmap = within(wheel).getByText("Encryption")
      .parentElement as HTMLElement;

    expect(live.className).not.toContain("border-dashed");
    expect(roadmap.className).toContain("border-dashed");
  });
});

describe("VaultWheel key", () => {
  it("shows a solid Available now entry and a faded Roadmap entry", () => {
    const { container } = render(<VaultWheel />);

    const available = screen.getByText("Available now");
    const roadmap = screen.getByText("Roadmap");
    expect(available).toBeInTheDocument();
    expect(roadmap).toBeInTheDocument();

    const availableSwatch = available
      .closest("li")
      ?.querySelector("span") as HTMLElement;
    const roadmapSwatch = roadmap
      .closest("li")
      ?.querySelector("span") as HTMLElement;
    expect(availableSwatch.className).not.toContain("border-dashed");
    expect(roadmapSwatch.className).toContain("border-dashed");

    // The key sits under the wheel, not inside the ring.
    const wheel = container.querySelector("[role='img']") as HTMLElement;
    expect(within(wheel).queryByText("Available now")).not.toBeInTheDocument();
  });
});
