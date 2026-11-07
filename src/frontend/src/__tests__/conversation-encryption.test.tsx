import type { backendInterface } from "@/backend";
import { render, screen, within } from "@testing-library/react";
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
import { MessageBubble } from "@/components/MessageBubble";

/**
 * Cover for the accepted change that removes end-to-end encryption from the
 * conversation screen: the header no longer advertises encryption, the message
 * text the backend returns is rendered as-is, and no browser-side decryption
 * runs. The backend now stores and returns plain text in `content`.
 *
 * The actor is a typed local mock, so this proves the UI/consumer contract
 * only. It does not prove the real canister releases a thread only to its two
 * participants.
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

describe("the conversation header no longer advertises encryption", () => {
  it("shows no lock icon and no 'End-to-end encrypted' label", async () => {
    await openConversation();

    const conversation = await screen.findByRole("region", {
      name: /conversation/i,
    });
    expect(
      within(conversation).queryByText(/end-to-end encrypted/i),
    ).not.toBeInTheDocument();
    // The old label carried a decorative lock icon; no lock glyph remains.
    expect(conversation.querySelector(".lucide-lock")).toBeNull();
  });
});

describe("message text is rendered as stored, with no browser decryption", () => {
  it("renders the plain text the backend returns", async () => {
    vi.mocked(actor.getThread).mockResolvedValue([
      makeMessage(OTHER, ME, "hello from grace", 1_000_000_000n),
    ]);
    await openConversation();

    expect(await screen.findByText("hello from grace")).toBeInTheDocument();
  });

  it("does not transform the stored text before display", async () => {
    // A value that a decrypt step would have mangled is shown verbatim.
    vi.mocked(actor.getThread).mockResolvedValue([
      makeMessage(OTHER, ME, "enc:not-ciphertext", 1_000_000_000n),
    ]);
    await openConversation();

    expect(await screen.findByText("enc:not-ciphertext")).toBeInTheDocument();
  });
});

describe("a single message bubble carries no encryption decoration", () => {
  it("renders the stored text verbatim with no lock icon or encryption label", () => {
    // The bubble is the component that renders each message, so the accepted
    // change must hold here too: the text is shown as stored, with no lock
    // glyph and no "End-to-end encrypted" wording anywhere in the bubble.
    const { container } = render(
      <MessageBubble
        message={makeMessage(OTHER, ME, "plain text body", 1_000_000_000n)}
        mine={false}
        index={0}
      />,
    );

    expect(screen.getByText("plain text body")).toBeInTheDocument();
    expect(container.querySelector(".lucide-lock")).toBeNull();
    expect(container.textContent ?? "").not.toMatch(/end-to-end encrypted/i);
  });
});
