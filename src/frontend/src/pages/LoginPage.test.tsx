import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { branding } from "@/lib/config";
import { LoginPage, SOVEREIGNTY_FRAMING } from "@/pages/LoginPage";

const authState = {
  isAuthenticated: false,
  isInitializing: false,
  isLoggingIn: false,
  isLoginError: false,
  loginError: undefined as Error | undefined,
  login: vi.fn(),
  clear: vi.fn(),
};

vi.mock("@caffeineai/core-infrastructure", () => ({
  useInternetIdentity: () => authState,
}));

/**
 * Renders the page with the intro's settle timeout faked, advances past the
 * lock-shake so the "Unlock the vault" action is revealed, then restores real
 * timers. Only the timeout the page schedules is faked, so React Testing
 * Library queries and user-event keep working.
 */
function renderAndSettle(props: { onOpenAbout?: () => void } = {}) {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  const utils = render(<LoginPage {...props} />);
  act(() => {
    vi.advanceTimersByTime(4000);
  });
  vi.useRealTimers();
  return utils;
}

/**
 * The accepted change keeps an intro over the sign-in content until the user
 * presses "Unlock the vault". These tests exercise the sign-in surface, so they
 * settle the intro and unlock it first exactly as a user would.
 */
async function renderSignIn() {
  const user = userEvent.setup();
  const utils = renderAndSettle();
  await user.click(screen.getByRole("button", { name: /unlock the vault/i }));
  return utils;
}

describe("LoginPage", () => {
  beforeEach(() => {
    authState.isLoggingIn = false;
    authState.isLoginError = false;
    authState.loginError = undefined;
    authState.login.mockClear();
  });

  it("shows the organization name and tagline", async () => {
    await renderSignIn();
    expect(
      screen.getByRole("heading", { name: branding.organizationName }),
    ).toBeInTheDocument();
    expect(screen.getByText(branding.tagline)).toBeInTheDocument();
  });

  it("renders the exact sovereignty framing text", async () => {
    await renderSignIn();
    expect(screen.getByText(SOVEREIGNTY_FRAMING)).toBeInTheDocument();
  });

  it("offers Internet Identity as the only sign-in method", async () => {
    await renderSignIn();
    expect(
      screen.getByRole("button", { name: /sign in with internet identity/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Internet Identity required/i)).toBeInTheDocument();
  });

  it("renders the SCS badge rather than the retired image asset", async () => {
    await renderSignIn();
    // The accepted change replaces the vault-door drawing with a flat round
    // SCS badge, exposed as a labelled image.
    expect(
      screen.getByRole("img", { name: `${branding.organizationName} emblem` }),
    ).toBeInTheDocument();
    expect(
      screen.queryByAltText(`${branding.organizationName} emblem`),
    ).not.toBeInTheDocument();
  });

  it("no longer shows the retired in-province wording", async () => {
    const { container } = await renderSignIn();
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/data stays in-province/i);
  });

  it("shows the sign-in error message when sign-in fails", async () => {
    authState.isLoginError = true;
    authState.loginError = new Error("Sign-in was cancelled.");
    await renderSignIn();

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Sign-in was cancelled.");
  });

  it("disables the sign-in button and shows progress while connecting", async () => {
    authState.isLoggingIn = true;
    await renderSignIn();

    const button = screen.getByRole("button", { name: /connecting/i });
    expect(button).toBeDisabled();
  });

  it("states the accepted sovereignty wording without claiming encryption", async () => {
    const { container } = await renderSignIn();
    const text = container.textContent ?? "";
    // The accepted statement no longer claims conversations are encrypted.
    expect(text).not.toMatch(/totally secure/i);
    expect(text).not.toMatch(/are end-to-end encrypted/i);
    // It names the two participants and the roadmap honestly.
    expect(text).toMatch(/only shown to the two people in each conversation/i);
    expect(text).toMatch(/development roadmap/i);
  });

  it("uses no province or government wording in its copy", async () => {
    const { container } = await renderSignIn();
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/province|provincial|Alberta|government/i);
  });

  it("starts Internet Identity sign-in when the sign-in button is pressed", async () => {
    // Adjacent behavior the intro rework must not break: the sign-in control
    // still invokes the auth hook's login action.
    const user = userEvent.setup();
    renderAndSettle();
    await user.click(screen.getByRole("button", { name: /unlock the vault/i }));

    await user.click(
      screen.getByRole("button", { name: /sign in with internet identity/i }),
    );

    expect(authState.login).toHaveBeenCalledTimes(1);
  });

  it("opens the About page from the sign-in card", async () => {
    // Adjacent behavior the intro rework must not break: the About affordance
    // still calls its callback.
    const user = userEvent.setup();
    const onOpenAbout = vi.fn();
    renderAndSettle({ onOpenAbout });
    await user.click(screen.getByRole("button", { name: /unlock the vault/i }));

    await user.click(
      screen.getByRole("button", { name: /about this service/i }),
    );

    expect(onOpenAbout).toHaveBeenCalledTimes(1);
  });
});

describe("Login page intro and vault wheel", () => {
  beforeEach(() => {
    authState.isLoggingIn = false;
    authState.isLoginError = false;
    authState.loginError = undefined;
  });

  it("shows the vault-closing intro with no Skip button before sign-in", () => {
    const { container } = render(<LoginPage />);

    const intro = container.querySelector(
      "[data-ocid='login.intro']",
    ) as HTMLElement;
    expect(intro).not.toBeNull();
    // The intro is the vault-closing sequence, not the feature wheel.
    expect(intro.querySelector(".vault-closing")).not.toBeNull();
    expect(intro.querySelector(".vault-closing-door")).not.toBeNull();
    expect(intro.querySelector(".vault-closing-wheel")).not.toBeNull();
    // The accepted change removes the Skip button entirely.
    expect(
      screen.queryByRole("button", { name: /skip/i }),
    ).not.toBeInTheDocument();
    // The sign-in affordance is not shown until the intro ends.
    expect(
      screen.queryByRole("button", {
        name: /sign in with internet identity/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("reveals the Unlock the vault action only after the lock-shake settles", () => {
    // The requirement stops the intro on the locked vault and only then shows
    // the unlock action. Fake only the timeout the page schedules.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      render(<LoginPage />);
      // Before the settle window the action is not yet offered.
      expect(
        screen.queryByRole("button", { name: /unlock the vault/i }),
      ).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(4000);
      });

      expect(
        screen.getByRole("button", { name: /unlock the vault/i }),
      ).toBeInTheDocument();
      // The intro still holds the sign-in content back until the user unlocks.
      expect(
        screen.queryByRole("button", {
          name: /sign in with internet identity/i,
        }),
      ).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not auto-complete into the sign-in page on a fixed duration", () => {
    // The accepted change waits for the unlock action instead of advancing on
    // its own. Even well past the old duration the sign-in content stays hidden.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      render(<LoginPage />);
      act(() => {
        vi.advanceTimersByTime(60_000);
      });

      expect(
        screen.queryByRole("button", {
          name: /sign in with internet identity/i,
        }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /unlock the vault/i }),
      ).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("reveals the sign-in page when Unlock the vault is pressed", async () => {
    const user = userEvent.setup();
    const { container } = renderAndSettle();

    await user.click(screen.getByRole("button", { name: /unlock the vault/i }));

    expect(
      container.querySelector("[data-ocid='login.intro']"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /sign in with internet identity/i,
      }),
    ).toBeInTheDocument();
  });

  it("gives the unlock action a soft, slow glowing pulse", async () => {
    renderAndSettle();

    const unlock = screen.getByRole("button", { name: /unlock the vault/i });
    // The glow is a pulsing halo behind the action, not a static ring.
    const halo = unlock.parentElement?.querySelector(
      "[aria-hidden='true']",
    ) as HTMLElement;
    expect(halo).not.toBeNull();
    expect(halo.className).toContain("animate-pulse");
    expect(halo.className).toContain("blur");
  });

  it("keeps the wheel visible beside the sign-in button after the intro", async () => {
    const user = userEvent.setup();
    const { container } = renderAndSettle();

    await user.click(screen.getByRole("button", { name: /unlock the vault/i }));

    const wheelPanel = container.querySelector(
      "[data-ocid='login.wheel_panel']",
    ) as HTMLElement;
    expect(wheelPanel).not.toBeNull();
    expect(
      within(wheelPanel).getByRole("img", {
        name: `${branding.organizationName} capabilities`,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /sign in with internet identity/i,
      }),
    ).toBeInTheDocument();
  });

  it("paints the SCS badge in navy and gold theme colours", async () => {
    // The accepted change makes the badge paint visible artwork by wrapping the
    // theme's raw OKLCH component variables in oklch(...). A bare
    // `var(--primary)` would be an invalid colour and paint nothing.
    await renderSignIn();
    const emblem = screen.getByRole("img", {
      name: `${branding.organizationName} emblem`,
    });
    const markup = emblem.outerHTML;
    expect(markup).toContain("oklch(var(--primary))");
    expect(markup).toContain("oklch(var(--accent))");
    expect(markup).not.toMatch(/(?:fill|stroke)="var\(--(?:primary|accent)\)"/);
  });

  it("renders no vault-door watermark on the sign-in page", () => {
    const { container } = render(<LoginPage />);
    expect(container.querySelector(".vault-watermark")).toBeNull();
  });

  it("labels the live capabilities and the faded roadmap items", async () => {
    const user = userEvent.setup();
    const { container } = renderAndSettle();
    await user.click(screen.getByRole("button", { name: /unlock the vault/i }));

    const wheel = container.querySelector(
      "[data-ocid='login.wheel_panel'] [role='img']",
    ) as HTMLElement;
    expect(wheel).not.toBeNull();

    for (const label of [
      "Directory",
      "Private Messaging",
      "Admin Approval",
      "Internet Identity",
      "Independent Nodes",
    ]) {
      expect(within(wheel).getByText(label)).toBeInTheDocument();
    }
    for (const label of [
      "Encryption",
      "Canadian Hosting",
      "File Sharing",
      "Documents",
      "Email",
    ]) {
      expect(within(wheel).getByText(label)).toBeInTheDocument();
    }

    // Roadmap circles are drawn faded (dashed border); live ones are solid.
    const roadmap = within(wheel).getByText("Encryption")
      .parentElement as HTMLElement;
    expect(roadmap.className).toContain("border-dashed");
    const live = within(wheel).getByText("Directory")
      .parentElement as HTMLElement;
    expect(live.className).not.toContain("border-dashed");
  });

  it("shows a key with a solid Available now entry and a faded Roadmap entry", async () => {
    const user = userEvent.setup();
    const { container } = renderAndSettle();
    await user.click(screen.getByRole("button", { name: /unlock the vault/i }));

    const wheelPanel = container.querySelector(
      "[data-ocid='login.wheel_panel']",
    ) as HTMLElement;
    const available = within(wheelPanel).getByText("Available now");
    const roadmap = within(wheelPanel).getByText("Roadmap");
    expect(available).toBeInTheDocument();
    expect(roadmap).toBeInTheDocument();

    // The key swatches mirror the wheel: solid for available, dashed for roadmap.
    const availableSwatch = available
      .closest("li")
      ?.querySelector("span") as HTMLElement;
    const roadmapSwatch = roadmap
      .closest("li")
      ?.querySelector("span") as HTMLElement;
    expect(availableSwatch.className).not.toContain("border-dashed");
    expect(roadmapSwatch.className).toContain("border-dashed");
  });

  it("shows the Powered by the Internet Computer note at the bottom", async () => {
    await renderSignIn();
    expect(
      screen.getByText("Powered by the Internet Computer"),
    ).toBeInTheDocument();
  });

  it("paints a plain navy backdrop immediately and fades the vault image in on load", () => {
    const { container } = render(<LoginPage />);
    const background = container.querySelector(
      "img[src='/assets/images/vault-door.jpg']",
    ) as HTMLImageElement;
    expect(background).not.toBeNull();
    // The image is decorative and sits behind a darkening overlay.
    expect(background).toHaveAttribute("alt", "");
    // Before it decodes the photo is fully transparent, so the navy backdrop
    // shows through immediately rather than a blank or half-loaded image.
    expect(background.className).toContain("opacity-0");
    expect(background.className).toContain("transition-opacity");

    // Once the image loads it fades in over the navy backdrop.
    fireEvent.load(background);
    expect(background.className).toContain("opacity-40");
    expect(background.className).not.toContain("opacity-0");
  });

  it("keeps the navy backdrop behind the vault image", () => {
    const { container } = render(<LoginPage />);
    const backdrop = container.querySelector(
      "div[aria-hidden='true'].bg-primary",
    ) as HTMLElement;
    expect(backdrop).not.toBeNull();
    // The darkening scrim sits over the photo so the sign-in text stays legible.
    expect(backdrop.querySelector(".bg-primary\\/70")).not.toBeNull();
  });

  it("renders the sign-in copy in white or very light grey over the overlay", async () => {
    await renderSignIn();

    const heading = screen.getByRole("heading", {
      name: branding.organizationName,
    });
    expect(heading.className).toContain("text-white");

    const tagline = screen.getByText(branding.tagline);
    expect(tagline.className).toMatch(/text-white/);

    const description = screen.getByText(
      /a directory and direct messaging service/i,
    );
    expect(description.className).toMatch(/text-white/);
  });
});
