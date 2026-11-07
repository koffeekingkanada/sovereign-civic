import { Role, Status } from "@/backend";
import type { backendInterface } from "@/backend";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AWAITING_MESSAGE,
  ME,
  OTHER,
  makeActor,
  makeEntry,
  makeProfile,
  renderApp,
} from "@/__tests__/support";

/**
 * Characterization baseline for the frontend contract the first-sign-in model
 * depends on: the app renders whatever profile the backend returns from
 * `registerProfile` / `getMyProfile`, and never decides Super Admin status from
 * a principal literal of its own.
 *
 * These are adjacent behaviors the request must not break — the app already
 * honors the returned `role`/`status` generically. The identity resolution
 * itself (which principal becomes Super Admin) lives in the backend and is not
 * exercised here.
 */

const authState = {
  isAuthenticated: true,
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
  authState.isAuthenticated = true;
  authState.isInitializing = false;
  actor = makeActor();
});

async function completeSignup(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText(/full name/i), "Ada Lovelace");
  await user.type(screen.getByLabelText(/work email/i), "ada@finance.gov");
  await user.type(screen.getByLabelText(/department or team/i), "Finance");
  await user.type(screen.getByLabelText(/job title/i), "Analyst");
  await user.click(screen.getByRole("button", { name: /submit request/i }));
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

describe("the app renders the profile the backend returns", () => {
  it("lands an approved registrant on the directory with the Admin console", async () => {
    const user = userEvent.setup();
    // The first registrant: the backend returns an Approved Super Admin.
    const approvedSuper = makeProfile({
      principal: ME,
      fullName: "Ada Lovelace",
      role: Role.superAdmin,
      status: Status.approved,
      department: "",
      workEmail: "",
    });
    vi.mocked(actor.getMyProfile)
      .mockResolvedValueOnce(null)
      .mockResolvedValue(approvedSuper);
    vi.mocked(actor.registerProfile).mockResolvedValue(approvedSuper);
    vi.mocked(actor.listDirectory).mockResolvedValue([
      makeEntry(ME, "Ada Lovelace"),
      makeEntry(OTHER, "Grace Hopper"),
    ]);
    renderApp();

    await completeSignup(user);

    // The returned Approved profile drives the next screen: the directory, not
    // the awaiting-approval screen.
    expect(
      await screen.findByRole("heading", { name: /^Directory$/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText(AWAITING_MESSAGE)).not.toBeInTheDocument();
    expect(await screen.findByText("Grace Hopper")).toBeInTheDocument();
    // An Approved Super Admin gets the Admin nav item.
    expect(screen.getByRole("button", { name: /^Admin$/ })).toBeInTheDocument();
  });

  it("keeps a Pending registrant on the awaiting-approval screen", async () => {
    const user = userEvent.setup();
    const pending = makeProfile({
      principal: ME,
      fullName: "Ada Lovelace",
      status: Status.pending,
    });
    vi.mocked(actor.getMyProfile)
      .mockResolvedValueOnce(null)
      .mockResolvedValue(pending);
    vi.mocked(actor.registerProfile).mockResolvedValue(pending);
    renderApp();

    await completeSignup(user);

    expect(await screen.findByText(AWAITING_MESSAGE)).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /^Directory$/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Admin$/ }),
    ).not.toBeInTheDocument();
  });
});

describe("default route", () => {
  it("renders a non-blank screen for an approved user", async () => {
    vi.mocked(actor.getMyProfile).mockResolvedValue(makeProfile());
    vi.mocked(actor.listDirectory).mockResolvedValue([
      makeEntry(ME, "Ada Lovelace"),
    ]);
    const { container } = renderApp();

    await screen.findByRole("heading", { name: /^Directory$/ });
    expect((container.textContent ?? "").trim().length).toBeGreaterThan(0);
  });

  it("renders a non-blank screen for an unauthenticated visitor", async () => {
    const user = userEvent.setup();
    authState.isAuthenticated = false;
    const { container } = renderAppAndSettle();

    // The accepted change keeps an intro over the sign-in content; settle it
    // and unlock the vault as a user would.
    await user.click(
      await screen.findByRole("button", { name: /unlock the vault/i }),
    );
    await screen.findByRole("button", {
      name: /sign in with internet identity/i,
    });
    expect((container.textContent ?? "").trim().length).toBeGreaterThan(0);
  });

  it("renders a non-blank screen while the session is initializing", async () => {
    authState.isInitializing = true;
    const { container } = renderApp();

    await waitFor(() => {
      expect(
        container.querySelector("[data-ocid='app.loading_state']"),
      ).not.toBeNull();
    });
    expect((container.textContent ?? "").trim().length).toBeGreaterThan(0);
  });
});
