import { Role, Status } from "@/backend";
import type { Profile } from "@/backend";
import type { Principal } from "@icp-sdk/core/principal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "@/App";
import { AboutPage } from "@/pages/AboutPage";
import { LoginPage, SOVEREIGNTY_FRAMING } from "@/pages/LoginPage";

/**
 * Cover for the accepted change: the About page is reachable without signing
 * in, from a link on the Login page, and the sovereignty statement is
 * character-identical on both pages.
 */

function fakePrincipal(text: string): Principal {
  return { toText: () => text } as unknown as Principal;
}

const ME = fakePrincipal("aaaaa-aa-me");

const authState = {
  isAuthenticated: false,
  isInitializing: false,
  isLoggingIn: false,
  isLoginError: false,
  loginError: undefined as Error | undefined,
  login: vi.fn(),
  clear: vi.fn(),
};

interface MockActor {
  getMyProfile: ReturnType<typeof vi.fn>;
  listDirectory: ReturnType<typeof vi.fn>;
  getThread: ReturnType<typeof vi.fn>;
  sendMessage: ReturnType<typeof vi.fn>;
  registerProfile: ReturnType<typeof vi.fn>;
}

let actor: MockActor;

vi.mock("@caffeineai/core-infrastructure", () => ({
  useInternetIdentity: () => authState,
  useActor: () => ({ actor, isFetching: false }),
}));

function makeProfile(fullName: string): Profile {
  return {
    principal: ME,
    fullName,
    workEmail: "ada@finance.gov",
    department: "Finance",
    jobTitle: "Analyst",
    role: Role.member,
    status: Status.approved,
    isDemo: false,
    registeredAt: 1n,
  };
}

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

/**
 * Renders the app with the sign-in intro's settle timeout faked, advances past
 * the lock-shake so the "Unlock the vault" action is revealed, then restores
 * real timers. Only the timeout the page schedules is faked.
 */
function renderAppAndSettle() {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  const utils = renderApp();
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
async function unlockVault(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    await screen.findByRole("button", { name: /unlock the vault/i }),
  );
}

beforeEach(() => {
  authState.isAuthenticated = false;
  authState.isInitializing = false;
  actor = {
    getMyProfile: vi.fn().mockResolvedValue(makeProfile("Ada Lovelace")),
    listDirectory: vi.fn().mockResolvedValue([]),
    getThread: vi.fn().mockResolvedValue([]),
    sendMessage: vi.fn(),
    registerProfile: vi.fn(),
  };
});

describe("public About page", () => {
  it("renders the About content for a visitor who is not signed in", () => {
    render(<AboutPage />);
    expect(
      screen.getByRole("heading", { name: /independent infrastructure/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(SOVEREIGNTY_FRAMING)).toBeInTheDocument();
  });

  it("opens the About page from the Login page link without signing in", async () => {
    const user = userEvent.setup();
    renderAppAndSettle();

    // The visitor starts on the Login page and is not authenticated. The
    // accepted change keeps an intro over the sign-in content; settle it and
    // unlock the vault first.
    await unlockVault(user);
    expect(
      await screen.findByRole("button", {
        name: /sign in with internet identity/i,
      }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /about this service/i }),
    );

    expect(
      await screen.findByRole("heading", {
        name: /independent infrastructure/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(SOVEREIGNTY_FRAMING)).toBeInTheDocument();
    // Still unauthenticated: the sign-in affordance is gone, not the session.
    expect(
      screen.queryByRole("button", {
        name: /sign in with internet identity/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("returns from the About page to the Login page", async () => {
    const user = userEvent.setup();
    const { container } = renderAppAndSettle();

    await unlockVault(user);
    await user.click(
      await screen.findByRole("button", { name: /about this service/i }),
    );
    await screen.findByRole("heading", { name: /independent infrastructure/i });

    await user.click(screen.getByRole("button", { name: /back to sign in/i }));

    // Returning to the Login page re-mounts the intro over the sign-in
    // content, so the visitor is back on the Login page rather than About.
    expect(container.querySelector("[data-ocid='login.intro']")).not.toBeNull();
    expect(
      screen.queryByRole("heading", { name: /independent infrastructure/i }),
    ).not.toBeInTheDocument();
  });

  it("renders the sovereignty statement character-identical on both pages", async () => {
    const user = userEvent.setup();
    const about = render(<AboutPage />);
    const aboutText = within(about.container).getByText(
      SOVEREIGNTY_FRAMING,
    ).textContent;
    about.unmount();

    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const login = render(<LoginPage />);
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    vi.useRealTimers();
    await unlockVault(user);
    const loginText = within(login.container).getByText(
      SOVEREIGNTY_FRAMING,
    ).textContent;

    expect(aboutText).toBe(loginText);
    expect(aboutText).toBe(SOVEREIGNTY_FRAMING);
  });
});
