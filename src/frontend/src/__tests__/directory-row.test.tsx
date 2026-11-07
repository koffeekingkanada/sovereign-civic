import { Status } from "@/backend";
import type { backendInterface } from "@/backend";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ME,
  OTHER,
  THIRD,
  makeActor,
  makeEntry,
  makeMessage,
  makeProfile,
  renderApp,
} from "@/__tests__/support";
import { initials, shortenPrincipal } from "@/components/UserListItem";

/**
 * Characterization baseline for Directory behavior the row rework must not
 * change: the signed-in user's own row stays non-messageable, search still
 * filters by name and principal, and opening then leaving a conversation still
 * returns to the list. The actor is a typed local mock, so this proves the
 * UI/consumer contract only.
 *
 * Deliberately NOT frozen here: the full principal text, the Message button
 * being the only way to open a conversation, and the row not being tappable.
 * The accepted request intentionally changes all three.
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
    makeEntry(THIRD, "Katherine Johnson"),
  ]);
});

describe("the signed-in user's own directory row", () => {
  it("is marked as self and offers no Message action", async () => {
    renderApp();
    await screen.findByText("Grace Hopper");

    const selfRow = document.querySelector(
      "[data-ocid='directory.item.1']",
    ) as HTMLElement;
    expect(within(selfRow).getByText("This is you")).toBeInTheDocument();
    expect(within(selfRow).getByText("You")).toBeInTheDocument();
    expect(
      within(selfRow).queryByRole("button", { name: /message/i }),
    ).not.toBeInTheDocument();
  });

  it("still offers a Message action on every other row", async () => {
    renderApp();
    await screen.findByText("Grace Hopper");

    const graceRow = document.querySelector(
      "[data-ocid='directory.item.2']",
    ) as HTMLElement;
    const katherineRow = document.querySelector(
      "[data-ocid='directory.item.3']",
    ) as HTMLElement;
    expect(
      within(graceRow).getByRole("button", { name: /message/i }),
    ).toBeInTheDocument();
    expect(
      within(katherineRow).getByRole("button", { name: /message/i }),
    ).toBeInTheDocument();
  });
});

describe("directory search", () => {
  it("filters rows by display name", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Grace Hopper");

    await user.type(screen.getByLabelText(/search directory/i), "katherine");

    expect(await screen.findByText("Katherine Johnson")).toBeInTheDocument();
    expect(screen.queryByText("Grace Hopper")).not.toBeInTheDocument();
  });

  it("filters rows by principal text", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Grace Hopper");

    await user.type(screen.getByLabelText(/search directory/i), "bbbbb");

    expect(await screen.findByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.queryByText("Katherine Johnson")).not.toBeInTheDocument();
  });

  it("shows a no-match state when nothing matches the query", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Grace Hopper");

    await user.type(screen.getByLabelText(/search directory/i), "zzzzz");

    expect(await screen.findByText(/no matching staff/i)).toBeInTheDocument();
  });
});

/**
 * Characterization baseline for the two pure helpers the row rework must keep
 * intact. The accepted change makes the display name wrap on phones, but the
 * monogram and the shortened principal are adjacent behavior that must survive
 * that edit unchanged.
 */
describe("directory row helpers", () => {
  it("derives a two-letter monogram from a display name", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(initials("Grace Hopper")).toBe("GH");
    expect(initials("Katherine Johnson")).toBe("KJ");
  });

  it("uses the first two letters for a single-word name", () => {
    expect(initials("Prince")).toBe("PR");
  });

  it("falls back to a placeholder for an empty name", () => {
    expect(initials("   ")).toBe("?");
  });

  it("shortens a long principal to its first and last five characters", () => {
    expect(shortenPrincipal("bbbbb-bb-other")).toBe("bbbbb…other");
  });

  it("leaves a short principal unchanged", () => {
    expect(shortenPrincipal("aaaaa-aa-me")).toBe("aaaaa-aa-me");
  });
});

describe("opening and leaving a conversation", () => {
  it("returns to the directory list when the back control is used", async () => {
    const user = userEvent.setup();
    vi.mocked(actor.getThread).mockResolvedValue([
      makeMessage(OTHER, ME, "hello there", 1_000_000_000n),
    ]);
    renderApp();
    await screen.findByText("Grace Hopper");

    // Grace is the second directory entry; target her row's Message button.
    const graceRow = document.querySelector(
      "[data-ocid='directory.item.2']",
    ) as HTMLElement;
    await user.click(
      within(graceRow).getByRole("button", { name: /message/i }),
    );
    expect(await screen.findByText("hello there")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /back to directory/i }),
    );

    await waitFor(() => {
      expect(screen.queryByText("hello there")).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", { name: /^Directory$/ }),
    ).toBeInTheDocument();
  });
});
