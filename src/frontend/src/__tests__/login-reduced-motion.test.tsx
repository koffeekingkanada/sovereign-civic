import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { branding } from "@/lib/config";
import { LoginPage } from "@/pages/LoginPage";

/**
 * Cover for the accepted change to the login page: the animated intro is
 * skipped entirely when the user prefers reduced motion, so the wheel and the
 * sign-in content are shown directly with no entrance animation.
 *
 * jsdom does not evaluate CSS media queries, so this stubs `matchMedia` to
 * report the reduced-motion preference and asserts the page's observable
 * response: no intro, no Skip button, and the sign-in surface present.
 */

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    login: vi.fn(),
    isLoggingIn: false,
    isLoginError: false,
    loginError: undefined,
  }),
}));

const originalMatchMedia = window.matchMedia;

function stubReducedMotion() {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion: reduce"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe("the login page respects the reduced-motion preference", () => {
  it("skips the intro and shows the sign-in content directly", () => {
    stubReducedMotion();
    const { container } = render(<LoginPage />);

    // No intro, no Skip button and no unlock action for a reduced-motion user.
    expect(
      container.querySelector("[data-ocid='login.intro']"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /skip/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /unlock the vault/i }),
    ).not.toBeInTheDocument();

    // The sign-in surface and the wheel are shown directly.
    expect(
      screen.getByRole("button", { name: /sign in with internet identity/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: branding.organizationName }),
    ).toBeInTheDocument();
    expect(
      container.querySelector("[data-ocid='login.wheel_panel']"),
    ).not.toBeNull();
  });

  it("guards the entrance containers with the motion-safe variant", () => {
    stubReducedMotion();
    const { container } = render(<LoginPage />);

    // The animation class is only applied under the `motion-safe:` variant, so
    // a user who prefers reduced motion gets no entrance animation.
    const animated = container.querySelectorAll(
      ".motion-safe\\:animate-fade-in-up",
    );
    expect(animated.length).toBeGreaterThan(0);
    for (const node of animated) {
      expect(node.className).toContain("motion-safe:animate-fade-in-up");
    }
  });
});
