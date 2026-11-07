import type { backendInterface } from "@/backend";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ME,
  OTHER,
  makeActor,
  makeEntry,
  makeMessage,
  makeProfile,
  renderApp,
} from "@/__tests__/support";

/**
 * Baseline for the conversation screen after the accepted change removed the
 * vetKD conversation-key flow. The app renders the default route without a
 * blank screen and opens a conversation that renders the stored message text
 * directly, with no key derivation or decryption step.
 *
 * The actor is a typed local mock, so this proves the UI/consumer contract
 * only. It does not prove real canister behavior.
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
  vi.mocked(actor.getMyProfile).mockResolvedValue(makeProfile());
  vi.mocked(actor.listDirectory).mockResolvedValue([
    makeEntry(ME, "Ada Lovelace"),
    makeEntry(OTHER, "Grace Hopper"),
  ]);
});

/** Open the conversation with Grace Hopper from the directory. */
async function openConversation() {
  const user = userEvent.setup({ delay: null });
  renderApp();
  await screen.findByText("Grace Hopper");
  await user.click(screen.getByRole("button", { name: /message/i }));
  return user;
}

describe("the default route renders without a blank screen", () => {
  it("shows the directory and the signed-in user's name", async () => {
    renderApp();

    expect(
      await screen.findByRole("heading", { name: /^Directory$/ }),
    ).toBeInTheDocument();
    // The signed-in user's name appears in the header chip and the directory
    // greeting; at least one occurrence proves the shell rendered.
    expect(screen.getAllByText("Ada Lovelace").length).toBeGreaterThan(0);
    // The directory list renders the other registered staff, so the default
    // route is not a blank screen.
    expect(await screen.findByText("Grace Hopper")).toBeInTheDocument();
  });
});

describe("opening a conversation renders the stored thread", () => {
  it("shows the thread text without an error alert", async () => {
    vi.mocked(actor.getThread).mockResolvedValue([
      makeMessage(OTHER, ME, "hello from grace", 1_000_000_000n),
    ]);
    await openConversation();

    expect(await screen.findByText("hello from grace")).toBeInTheDocument();
    // No error alert is shown when the thread loads.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the loading state while the thread is in flight", async () => {
    // Hold the thread request open so the loading branch is observable.
    let releaseThread: (messages: ReturnType<typeof makeMessage>[]) => void =
      () => {};
    vi.mocked(actor.getThread).mockReturnValue(
      new Promise((resolve) => {
        releaseThread = resolve;
      }),
    );
    await openConversation();

    expect(
      document.querySelector("[data-ocid='thread.loading_state']"),
    ).not.toBeNull();

    releaseThread([]);
    expect(await screen.findByText(/no messages yet/i)).toBeInTheDocument();
  });
});

describe("the thread error branch still renders an alert region", () => {
  it("renders a role=alert when the thread request fails", async () => {
    vi.mocked(actor.getThread).mockRejectedValue(new Error("boom"));
    await openConversation();

    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert.textContent?.trim().length ?? 0).toBeGreaterThan(0);
  });
});
