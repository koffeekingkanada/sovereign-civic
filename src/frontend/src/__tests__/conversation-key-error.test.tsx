import type { backendInterface } from "@/backend";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ME,
  OTHER,
  makeActor,
  makeEntry,
  makeProfile,
  renderApp,
} from "@/__tests__/support";

/**
 * Cover for the conversation error branch after the accepted change removed the
 * vetKD conversation-key flow. The surviving failure path is the thread request
 * itself: when it fails, the page shows a clear error state rather than a blank
 * or garbled thread.
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

describe("the conversation thread error branch", () => {
  it("renders a role=alert when the thread request fails", async () => {
    vi.mocked(actor.getThread).mockRejectedValue(new Error("boom"));
    await openConversation();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/could not be loaded/i);
  });

  it("does not render a blank thread when the request fails", async () => {
    vi.mocked(actor.getThread).mockRejectedValue(new Error("boom"));
    await openConversation();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    expect(screen.queryByText(/no messages yet/i)).not.toBeInTheDocument();
  });
});
