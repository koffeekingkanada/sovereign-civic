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
 * Characterization baseline for the sovereignty statement and the authenticated
 * About navigation. These behaviors must survive the change that makes About
 * reachable while unauthenticated and adds a Login -> About link; they are not
 * the behavior the request intentionally changes.
 */

function fakePrincipal(text: string): Principal {
  return { toText: () => text } as unknown as Principal;
}

const ME = fakePrincipal("aaaaa-aa-me");

const authState = {
  isAuthenticated: true,
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

beforeEach(() => {
  authState.isAuthenticated = true;
  authState.isInitializing = false;
  actor = {
    getMyProfile: vi.fn().mockResolvedValue(makeProfile("Ada Lovelace")),
    listDirectory: vi.fn().mockResolvedValue([]),
    getThread: vi.fn().mockResolvedValue([]),
    sendMessage: vi.fn(),
    registerProfile: vi.fn(),
  };
});

/**
 * The accepted change keeps an intro that covers the sign-in content until the
 * user presses "Unlock the vault". These tests exercise the sign-in surface, so
 * they settle the intro and unlock it first exactly as a user would.
 */
async function renderLoginSignIn() {
  const user = userEvent.setup();
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  const utils = render(<LoginPage />);
  act(() => {
    vi.advanceTimersByTime(4000);
  });
  vi.useRealTimers();
  await user.click(
    await screen.findByRole("button", { name: /unlock the vault/i }),
  );
  return utils;
}

describe("sovereignty statement consistency", () => {
  it("renders character-identical framing text on the About and Login pages", async () => {
    const about = render(<AboutPage />);
    const aboutText = within(about.container).getByText(
      SOVEREIGNTY_FRAMING,
    ).textContent;
    about.unmount();

    const login = await renderLoginSignIn();
    const loginText = within(login.container).getByText(
      SOVEREIGNTY_FRAMING,
    ).textContent;

    expect(aboutText).toBe(loginText);
    expect(aboutText).toBe(SOVEREIGNTY_FRAMING);
  });

  it("shows the accepted statement text on both pages", async () => {
    // The accepted change replaces the statement wording. The new text names
    // the two participants and places encryption on the roadmap rather than
    // claiming it is in place.
    const about = render(<AboutPage />);
    const aboutPanel = about.container.querySelector(
      "[data-ocid='about.framing_panel']",
    ) as HTMLElement;
    expect(aboutPanel).toHaveTextContent(
      /only shown to the two people in each conversation/i,
    );
    expect(aboutPanel).toHaveTextContent(/development roadmap/i);
    expect(aboutPanel).not.toHaveTextContent(/are end-to-end encrypted/i);
    about.unmount();

    const login = await renderLoginSignIn();
    const loginPanel = login.container.querySelector(
      "[data-ocid='login.framing_panel']",
    ) as HTMLElement;
    expect(loginPanel).toHaveTextContent(
      /only shown to the two people in each conversation/i,
    );
    expect(loginPanel).toHaveTextContent(/development roadmap/i);
    expect(loginPanel).not.toHaveTextContent(/are end-to-end encrypted/i);
  });

  it("keeps the framing panel heading on both pages", async () => {
    const about = render(<AboutPage />);
    expect(
      within(about.container).getByRole("heading", {
        name: /sovereignty and scope/i,
      }),
    ).toBeInTheDocument();
    about.unmount();

    await renderLoginSignIn();
    expect(
      screen.getByRole("heading", { name: /sovereignty and scope/i }),
    ).toBeInTheDocument();
  });

  it("keeps a non-empty statement body under the panel heading on both pages", async () => {
    // The accepted change replaces the statement wording. The panel structure
    // is adjacent behavior that must survive: each page still renders the
    // "Sovereignty and scope" heading with a non-empty paragraph beneath it.
    // This deliberately does not pin the wording, which is being replaced.
    const about = render(<AboutPage />);
    const aboutPanel = about.container.querySelector(
      "[data-ocid='about.framing_panel']",
    ) as HTMLElement;
    expect(
      within(aboutPanel).getByRole("heading", {
        name: /sovereignty and scope/i,
      }),
    ).toBeInTheDocument();
    expect((aboutPanel.textContent ?? "").trim().length).toBeGreaterThan(
      "Sovereignty and scope".length,
    );
    about.unmount();

    const login = await renderLoginSignIn();
    const loginPanel = login.container.querySelector(
      "[data-ocid='login.framing_panel']",
    ) as HTMLElement;
    expect(
      within(loginPanel).getByRole("heading", {
        name: /sovereignty and scope/i,
      }),
    ).toBeInTheDocument();
    expect((loginPanel.textContent ?? "").trim().length).toBeGreaterThan(
      "Sovereignty and scope".length,
    );
  });
});

describe("authenticated About navigation", () => {
  it("opens the About page from the header nav while signed in", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByRole("heading", { name: /^Directory$/ });

    await user.click(screen.getByRole("button", { name: /^About$/ }));

    expect(
      await screen.findByRole("heading", {
        name: /independent infrastructure/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(SOVEREIGNTY_FRAMING)).toBeInTheDocument();
  });
});

describe("Login page sign-in affordances", () => {
  it("keeps Internet Identity as the only sign-in method", async () => {
    authState.isAuthenticated = false;
    await renderLoginSignIn();
    expect(
      screen.getByRole("button", { name: /sign in with internet identity/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Internet Identity required/i)).toBeInTheDocument();
  });
});
