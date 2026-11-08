import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeActor, makeProfile, renderApp } from "@/__tests__/support";
import type { backendInterface } from "@/backend";
import { BUILD_TIMESTAMP, BUILD_VERSION, Layout } from "@/components/Layout";
import { branding } from "@/lib/config";

const authState = {
  isAuthenticated: false,
  isInitializing: false,
  isLoggingIn: false,
  isLoginError: false,
  loginError: undefined as Error | undefined,
  login: vi.fn(),
  clear: vi.fn(),
};

let actor: backendInterface;

vi.mock("@caffeineai/core-infrastructure", () => ({
  useInternetIdentity: () => authState,
  useActor: () => ({ actor, isFetching: false }),
}));

beforeEach(() => {
  authState.isAuthenticated = false;
  authState.isInitializing = false;
  actor = makeActor();
});

/**
 * Cover for the accepted footer change: the tagline reads exactly
 * "Sovereign communication infrastructure." with no "Data stays in-province."
 * wording, and the "Built with love using caffeine.ai" line is gone.
 */
describe("Layout footer", () => {
  it("shows the accepted tagline with no in-province wording", () => {
    const { container } = render(
      <Layout header={<div>Header</div>}>
        <div>Body</div>
      </Layout>,
    );

    const footer = container.querySelector("footer") as HTMLElement;
    expect(footer).not.toBeNull();
    expect(footer).toHaveTextContent(branding.tagline);
    expect(footer).toHaveTextContent("Sovereign communication infrastructure.");
    expect(footer).not.toHaveTextContent(/data stays in-province/i);
  });

  it("no longer renders the caffeine.ai attribution line", () => {
    const { container } = render(
      <Layout header={<div>Header</div>}>
        <div>Body</div>
      </Layout>,
    );

    const footer = container.querySelector("footer") as HTMLElement;
    expect(footer).not.toHaveTextContent(/built with love/i);
    expect(footer).not.toHaveTextContent(/caffeine\.ai/i);
    expect(
      screen.queryByRole("link", { name: /caffeine\.ai/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the organization identity in the footer with no province wording", () => {
    const { container } = render(
      <Layout header={<div>Header</div>}>
        <div>Body</div>
      </Layout>,
    );

    const footer = container.querySelector("footer") as HTMLElement;
    expect(footer).toHaveTextContent(branding.organizationName);
    expect(footer).toHaveTextContent("Demo Organization");
    expect(footer).not.toHaveTextContent(/province|provincial|Alberta/i);
  });

  it("shows the Powered by the Internet Computer note in the footer", () => {
    const { container } = render(
      <Layout header={<div>Header</div>}>
        <div>Body</div>
      </Layout>,
    );

    const footer = container.querySelector("footer") as HTMLElement;
    expect(footer).toHaveTextContent("Powered by the Internet Computer");
  });

  it("still renders the header and main content around the footer", () => {
    render(
      <Layout header={<div>Header</div>}>
        <div>Body</div>
      </Layout>,
    );

    expect(screen.getByText("Header")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("renders exactly one footer with the header and main as siblings", () => {
    const { container } = render(
      <Layout header={<div>Header</div>}>
        <div>Body</div>
      </Layout>,
    );

    expect(container.querySelectorAll("footer")).toHaveLength(1);
    const footer = container.querySelector("footer") as HTMLElement;
    expect(footer.previousElementSibling?.tagName).toBe("MAIN");
    expect(footer.parentElement?.firstElementChild).toHaveTextContent("Header");
  });

  it("keeps the footer content on the signed-out Login page", async () => {
    const user = userEvent.setup();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { container } = renderApp();
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    vi.useRealTimers();
    await user.click(
      await screen.findByRole("button", { name: /unlock the vault/i }),
    );
    await screen.findByRole("button", {
      name: /sign in with internet identity/i,
    });

    const footer = container.querySelector("footer") as HTMLElement;
    expect(footer).not.toBeNull();
    expect(footer).toHaveTextContent(branding.organizationName);
    expect(footer).toHaveTextContent(branding.tagline);
    expect(footer).toHaveTextContent("Powered by the Internet Computer");
  });

  it("keeps the footer content on the signed-in Directory page", async () => {
    authState.isAuthenticated = true;
    vi.mocked(actor.getMyProfile).mockResolvedValue(makeProfile());
    const { container } = renderApp();
    await screen.findByRole("heading", { name: /^Directory$/ });

    const footer = container.querySelector("footer") as HTMLElement;
    expect(footer).not.toBeNull();
    expect(footer).toHaveTextContent(branding.organizationName);
    expect(footer).toHaveTextContent(branding.tagline);
    expect(footer).toHaveTextContent("Powered by the Internet Computer");
  });

  it("shows the build label with version, environment and formatted date", () => {
    const { container } = render(
      <Layout header={<div>Header</div>}>
        <div>Body</div>
      </Layout>,
    );

    const footer = container.querySelector("footer") as HTMLElement;
    expect(footer).toHaveTextContent(
      `Build ${BUILD_VERSION} · Live · Nov 7, 2026 14:20`,
    );
  });

  it("renders the build label as a small muted line", () => {
    const { container } = render(
      <Layout header={<div>Header</div>}>
        <div>Body</div>
      </Layout>,
    );

    const label = Array.from(container.querySelectorAll("p")).find((p) =>
      p.textContent?.startsWith("Build "),
    );
    expect(label).toBeDefined();
    expect(label).toHaveClass("text-xs", "text-muted-foreground");
  });

  it("reads Preview on a draft web address", () => {
    const original = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        hostname: "abc-draft.example.icp0.io",
        href: "https://abc-draft.example.icp0.io/",
      },
    });
    try {
      const { container } = render(
        <Layout header={<div>Header</div>}>
          <div>Body</div>
        </Layout>,
      );
      const footer = container.querySelector("footer") as HTMLElement;
      expect(footer).toHaveTextContent(
        `Build ${BUILD_VERSION} · Preview · Nov 7, 2026 14:20`,
      );
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: original,
      });
    }
  });

  it("reads Live on a non-draft web address", () => {
    const original = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        hostname: "app.example.icp0.io",
        href: "https://app.example.icp0.io/",
      },
    });
    try {
      const { container } = render(
        <Layout header={<div>Header</div>}>
          <div>Body</div>
        </Layout>,
      );
      const footer = container.querySelector("footer") as HTMLElement;
      expect(footer).toHaveTextContent(
        `Build ${BUILD_VERSION} · Live · Nov 7, 2026 14:20`,
      );
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: original,
      });
    }
  });

  it("keeps the build label on the signed-in Directory page", async () => {
    authState.isAuthenticated = true;
    vi.mocked(actor.getMyProfile).mockResolvedValue(makeProfile());
    const { container } = renderApp();
    await screen.findByRole("heading", { name: /^Directory$/ });

    const footer = container.querySelector("footer") as HTMLElement;
    expect(footer).toHaveTextContent(
      `Build ${BUILD_VERSION} · Live · Nov 7, 2026 14:20`,
    );
  });

  it("holds the build version and timestamp as single named constants", () => {
    expect(BUILD_VERSION).toBe("v22");
    expect(BUILD_TIMESTAMP).toBe("2026-11-07T14:20:00Z");
  });

  it("shows the accepted tagline and no retired wording anywhere in the app", async () => {
    const user = userEvent.setup();
    // The unauthenticated app renders the Login page inside the shared Layout.
    // The accepted change keeps an intro over the sign-in content; settle it
    // and unlock the vault as a user would.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { container } = renderApp();
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    vi.useRealTimers();
    await user.click(
      await screen.findByRole("button", { name: /unlock the vault/i }),
    );
    await screen.findByRole("button", {
      name: /sign in with internet identity/i,
    });

    const text = container.textContent ?? "";
    expect(text).toContain("Sovereign communication infrastructure.");
    expect(text).not.toMatch(/data stays in-province/i);
    expect(text).not.toMatch(/built with love/i);
    expect(text).not.toMatch(/caffeine\.ai/i);
  });
});
