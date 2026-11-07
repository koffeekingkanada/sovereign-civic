import type { backendInterface } from "@/backend";
import { screen, waitFor, within } from "@testing-library/react";
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
 * Baseline for the conversation screen after the accepted change removed
 * end-to-end encryption. The header identifies the recipient and offers a back
 * control, the thread renders in order and aligns by sender, and the
 * loading/error/empty states still exist. The message text is the plain text
 * the backend returns.
 *
 * The actor is a typed local mock, so this proves the UI/consumer contract
 * only, not real backend behavior.
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
  const user = userEvent.setup();
  renderApp();
  await screen.findByText("Grace Hopper");
  await user.click(screen.getByRole("button", { name: /message/i }));
  return user;
}

describe("conversation header", () => {
  it("identifies the recipient by display name and principal", async () => {
    await openConversation();

    // The directory list also shows the name, so scope to the conversation
    // section to prove the header itself identifies the recipient.
    const conversation = await screen.findByRole("region", {
      name: /conversation/i,
    });
    expect(within(conversation).getByText("Grace Hopper")).toBeInTheDocument();
    // The recipient's principal is shown in full in the header.
    expect(within(conversation).getByText(OTHER.toText())).toBeInTheDocument();
  });

  it("offers a back control that returns to the directory", async () => {
    const user = await openConversation();

    await user.click(
      screen.getByRole("button", { name: /back to directory/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /^Directory$/ }),
      ).toBeInTheDocument();
    });
  });

  it("marks a demo recipient with the Demo badge", async () => {
    vi.mocked(actor.listDirectory).mockResolvedValue([
      makeEntry(ME, "Ada Lovelace"),
      makeEntry(OTHER, "Grace Hopper", true),
    ]);
    await openConversation();

    const conversation = await screen.findByRole("region", {
      name: /conversation/i,
    });
    expect(within(conversation).getByText("Demo")).toBeInTheDocument();
  });

  it("identifies the recipient and offers the back control without an encryption label", async () => {
    // The accepted change removed the lock icon and the "End-to-end encrypted"
    // label from this header. The recipient identity and the back control are
    // adjacent behavior that must survive that removal, so this asserts them
    // without referencing the label at all.
    const user = await openConversation();

    const conversation = await screen.findByRole("region", {
      name: /conversation/i,
    });
    expect(within(conversation).getByText("Grace Hopper")).toBeInTheDocument();
    expect(within(conversation).getByText(OTHER.toText())).toBeInTheDocument();
    expect(
      within(conversation).queryByText(/end-to-end encrypted/i),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /back to directory/i }),
    );
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /^Directory$/ }),
      ).toBeInTheDocument();
    });
  });
});

describe("thread rendering", () => {
  it("renders messages oldest-to-newest in the order the backend returns them", async () => {
    vi.mocked(actor.getThread).mockResolvedValue([
      makeMessage(OTHER, ME, "first", 1_000_000_000n),
      makeMessage(ME, OTHER, "second", 2_000_000_000n),
      makeMessage(OTHER, ME, "third", 3_000_000_000n),
    ]);
    await openConversation();

    const bubbles = await screen.findAllByText(/first|second|third/);
    expect(bubbles.map((node) => node.textContent)).toEqual([
      "first",
      "second",
      "third",
    ]);
  });

  it("aligns the signed-in user's messages to the end and the other's to the start", async () => {
    vi.mocked(actor.getThread).mockResolvedValue([
      makeMessage(OTHER, ME, "from grace", 1_000_000_000n),
      makeMessage(ME, OTHER, "from me", 2_000_000_000n),
    ]);
    await openConversation();

    const theirs = (await screen.findByText("from grace")).closest(
      "[data-ocid^='thread.message.']",
    ) as HTMLElement;
    const mine = screen
      .getByText("from me")
      .closest("[data-ocid^='thread.message.']") as HTMLElement;

    expect(theirs.className).toContain("justify-start");
    expect(mine.className).toContain("justify-end");
  });

  it("shows the empty state when the thread has no messages", async () => {
    vi.mocked(actor.getThread).mockResolvedValue([]);
    await openConversation();

    expect(await screen.findByText(/no messages yet/i)).toBeInTheDocument();
  });

  it("shows an error state when the thread fails to load", async () => {
    vi.mocked(actor.getThread).mockRejectedValue(new Error("boom"));
    await openConversation();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/could not be loaded/i);
  });
});

describe("composer in an open conversation", () => {
  it("addresses the recipient by name in the placeholder", async () => {
    await openConversation();

    expect(
      await screen.findByPlaceholderText(/message grace hopper/i),
    ).toBeInTheDocument();
  });

  it("offers a send control wired to the open conversation", async () => {
    // The send contract itself (the plain text reaches the backend) is covered
    // at the hook boundary in conversation-send.test.tsx.
    await openConversation();

    expect(screen.getByLabelText("Message")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send message/i }),
    ).toBeInTheDocument();
  });
});

describe("conversation is scoped to the selected recipient", () => {
  it("requests the thread for the recipient principal only", async () => {
    await openConversation();

    await waitFor(() => {
      expect(actor.getThread).toHaveBeenCalledWith(OTHER);
    });
    expect(actor.getThread).not.toHaveBeenCalledWith(ME);
  });
});
