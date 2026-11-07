import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { branding } from "@/lib/config";
import { AboutPage } from "@/pages/AboutPage";
import { SOVEREIGNTY_FRAMING } from "@/pages/LoginPage";

describe("AboutPage", () => {
  it("explains the sovereignty value proposition", () => {
    render(<AboutPage />);
    expect(
      screen.getByRole("heading", { name: branding.organizationName }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/proof-of-concept directory and direct messaging/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /independent infrastructure/i }),
    ).toBeInTheDocument();
  });

  it("renders the accepted first paragraph verbatim", () => {
    render(<AboutPage />);
    expect(
      screen.getByText(
        "Sovereign Civic Systems is a proof-of-concept directory and direct messaging service for an organization's staff. This demonstration is configured for a sample organization.",
      ),
    ).toBeInTheDocument();
  });

  it("uses no province or government wording in its copy", () => {
    const { container } = render(<AboutPage />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/province|provincial|Alberta|government/i);
  });

  it("renders no vault-door watermark behind the About content", () => {
    const { container } = render(<AboutPage />);
    expect(container.querySelector(".vault-watermark")).toBeNull();
  });

  it("renders the accepted Independent infrastructure card body", () => {
    render(<AboutPage />);
    expect(
      screen.getByText(
        "Records and messages are held on the Internet Computer, operated by independent node providers rather than a single cloud company. Hosting on nodes located in Canada is on the development roadmap.",
      ),
    ).toBeInTheDocument();
  });

  it("renders the exact sovereignty framing text", () => {
    render(<AboutPage />);
    expect(screen.getByText(SOVEREIGNTY_FRAMING)).toBeInTheDocument();
  });

  it("states the accepted sovereignty wording without claiming encryption", () => {
    const { container } = render(<AboutPage />);
    const text = container.textContent ?? "";
    // The accepted statement no longer claims conversations are encrypted.
    expect(text).not.toMatch(/totally secure/i);
    expect(text).not.toMatch(/are end-to-end encrypted/i);
    // It names the two participants and the roadmap honestly.
    expect(text).toMatch(/only shown to the two people in each conversation/i);
    expect(text).toMatch(/development roadmap/i);
  });

  /**
   * Cover for the About page elements the accepted change does not touch: the
   * two remaining principle cards, the framing panel, and the back-to-sign-in
   * affordance. The first paragraph and the first card are pinned separately
   * against the accepted new wording.
   */
  it("keeps the two unchanged principle cards", () => {
    render(<AboutPage />);
    expect(
      screen.getByRole("heading", { name: /identity you can trust/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/anchored to Internet Identity/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /built for public service/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/restrained institutional register/i),
    ).toBeInTheDocument();
  });

  it("keeps the framing panel heading and its proof-of-concept scope note", () => {
    const { container } = render(<AboutPage />);
    const panel = container.querySelector(
      "[data-ocid='about.framing_panel']",
    ) as HTMLElement;
    expect(panel).not.toBeNull();
    expect(
      within(panel).getByRole("heading", { name: /sovereignty and scope/i }),
    ).toBeInTheDocument();
    expect(panel).toHaveTextContent(/group conversations and read receipts/i);
    expect(panel).toHaveTextContent(/proof of concept/i);
  });

  it("offers a back-to-sign-in control only when a handler is supplied", async () => {
    const user = userEvent.setup();
    const onBackToLogin = vi.fn();
    render(<AboutPage onBackToLogin={onBackToLogin} />);

    const back = screen.getByRole("button", { name: /back to sign in/i });
    await user.click(back);
    expect(onBackToLogin).toHaveBeenCalledTimes(1);
  });

  it("omits the back-to-sign-in control when no handler is supplied", () => {
    render(<AboutPage />);
    expect(
      screen.queryByRole("button", { name: /back to sign in/i }),
    ).not.toBeInTheDocument();
  });
});
