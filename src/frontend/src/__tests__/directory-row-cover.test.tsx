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

/**
 * Cover for the accepted Directory row rework: the principal is shortened to
 * its first and last few characters, every non-self row exposes a Message
 * button, and tapping anywhere on a row opens the same conversation the button
 * opens. The actor is a typed local mock, so this proves the UI/consumer
 * contract only.
 *
 * jsdom performs no layout, so "no sideways scrolling on a phone" is covered
 * indirectly: the row renders the shortened principal rather than the full
 * identifier, which is the mechanism that keeps the row within the viewport.
 * Real viewport measurement is out of scope here.
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

describe("principal shortening on a directory row", () => {
  it("shows the first and last few characters instead of the full principal", async () => {
    renderApp();
    await screen.findByText("Grace Hopper");

    const graceRow = document.querySelector(
      "[data-ocid='directory.item.2']",
    ) as HTMLElement;

    // OTHER is "bbbbb-bb-other": first five and last five characters.
    expect(within(graceRow).getByText("bbbbb…other")).toBeInTheDocument();
    expect(
      within(graceRow).queryByText("bbbbb-bb-other"),
    ).not.toBeInTheDocument();
  });

  it("keeps the full principal available as the row's title attribute", async () => {
    renderApp();
    await screen.findByText("Grace Hopper");

    const graceRow = document.querySelector(
      "[data-ocid='directory.item.2']",
    ) as HTMLElement;
    const principalLine = within(graceRow).getByText("bbbbb…other");
    expect(principalLine).toHaveAttribute("title", "bbbbb-bb-other");
  });
});

describe("display name wrapping on a phone-width row", () => {
  it("lets the full display name wrap instead of truncating on phones", async () => {
    vi.mocked(actor.listDirectory).mockResolvedValue([
      makeEntry(ME, "Ada Lovelace"),
      makeEntry(OTHER, "Alexandria Catherine Montgomery-Worthington"),
    ]);
    renderApp();
    await screen.findByText("Alexandria Catherine Montgomery-Worthington");

    const graceRow = document.querySelector(
      "[data-ocid='directory.item.2']",
    ) as HTMLElement;
    const name = within(graceRow).getByText(
      "Alexandria Catherine Montgomery-Worthington",
    );

    // The full name is rendered, not truncated to an ellipsis.
    expect(name).toBeInTheDocument();
    // On phones the name wraps (break-words); truncation only applies from the
    // `sm:` breakpoint up, so a phone-width row shows the whole name.
    expect(name.className).toContain("break-words");
    expect(name.className).toContain("sm:truncate");
    expect(name.className).not.toMatch(/(?:^|\s)truncate(?:\s|$)/);
  });
});

describe("Message button visibility across rows", () => {
  it("shows a visible Message button on every row except the signed-in user's", async () => {
    renderApp();
    await screen.findByText("Grace Hopper");

    const selfRow = document.querySelector(
      "[data-ocid='directory.item.1']",
    ) as HTMLElement;
    const graceRow = document.querySelector(
      "[data-ocid='directory.item.2']",
    ) as HTMLElement;
    const katherineRow = document.querySelector(
      "[data-ocid='directory.item.3']",
    ) as HTMLElement;

    expect(
      within(selfRow).queryByRole("button", { name: /message/i }),
    ).not.toBeInTheDocument();
    expect(
      within(graceRow).getByRole("button", { name: /message/i }),
    ).toBeVisible();
    expect(
      within(katherineRow).getByRole("button", { name: /message/i }),
    ).toBeVisible();
  });
});

describe("opening a conversation from a directory row", () => {
  it("opens the conversation when the row itself is tapped", async () => {
    const user = userEvent.setup();
    vi.mocked(actor.getThread).mockResolvedValue([
      makeMessage(OTHER, ME, "hello there", 1_000_000_000n),
    ]);
    renderApp();
    await screen.findByText("Grace Hopper");

    const graceRow = document.querySelector(
      "[data-ocid='directory.item.2']",
    ) as HTMLElement;
    await user.click(graceRow);

    expect(await screen.findByText("hello there")).toBeInTheDocument();
    expect(actor.getThread).toHaveBeenCalledWith(OTHER);
  });

  it("opens the same conversation when the Message button is used", async () => {
    const user = userEvent.setup();
    vi.mocked(actor.getThread).mockResolvedValue([
      makeMessage(OTHER, ME, "hello there", 1_000_000_000n),
    ]);
    renderApp();
    await screen.findByText("Grace Hopper");

    const graceRow = document.querySelector(
      "[data-ocid='directory.item.2']",
    ) as HTMLElement;
    await user.click(
      within(graceRow).getByRole("button", { name: /message/i }),
    );

    expect(await screen.findByText("hello there")).toBeInTheDocument();
    expect(actor.getThread).toHaveBeenCalledWith(OTHER);
  });

  it("does not open a conversation when the signed-in user's own row is tapped", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Grace Hopper");

    const selfRow = document.querySelector(
      "[data-ocid='directory.item.1']",
    ) as HTMLElement;
    await user.click(selfRow);

    await waitFor(() => {
      expect(actor.getThread).not.toHaveBeenCalled();
    });
    expect(screen.getByText(/select a colleague/i)).toBeInTheDocument();
  });
});
