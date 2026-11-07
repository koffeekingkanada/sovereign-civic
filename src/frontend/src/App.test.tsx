import { Status } from "@/backend";
import type { backendInterface } from "@/backend";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "@/App";

import {
  ME,
  OTHER,
  makeActor,
  makeEntry,
  makeMessage,
  makeProfile,
  renderApp,
} from "@/__tests__/support";
import {
  ENTRY_VIDEO_SESSION_KEY,
  ENTRY_VIDEO_SRC,
} from "@/components/EntryVideoOverlay";

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

describe("App authentication gating", () => {
  it("shows the Login page to an unauthenticated visitor", async () => {
    const user = userEvent.setup();
    authState.isAuthenticated = false;
    renderAppAndSettle();
    // The accepted change keeps an intro over the sign-in content; settle it
    // and unlock the vault as a user would.
    await user.click(
      await screen.findByRole("button", { name: /unlock the vault/i }),
    );
    expect(
      await screen.findByRole("button", {
        name: /sign in with internet identity/i,
      }),
    ).toBeInTheDocument();
    // The directory page is not shown; the wheel's "Directory" node is not the
    // directory navigation.
    expect(
      screen.queryByRole("navigation", { name: /^Primary$/ }),
    ).not.toBeInTheDocument();
  });

  it("shows the sign-up form to a first-time signed-in user", async () => {
    vi.mocked(actor.getMyProfile).mockResolvedValue(null);
    renderApp();
    expect(
      await screen.findByRole("heading", { name: /request access/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /^Directory$/ }),
    ).not.toBeInTheDocument();
  });

  it("submits the four sign-up fields to registerProfile", async () => {
    const user = userEvent.setup();
    vi.mocked(actor.getMyProfile).mockResolvedValue(null);
    vi.mocked(actor.registerProfile).mockResolvedValue(
      makeProfile({ status: Status.pending }),
    );
    renderApp();

    await user.type(await screen.findByLabelText(/full name/i), "Ada Lovelace");
    await user.type(screen.getByLabelText(/work email/i), "ada@finance.gov");
    await user.type(screen.getByLabelText(/department or team/i), "Finance");
    await user.type(screen.getByLabelText(/job title/i), "Analyst");
    await user.click(screen.getByRole("button", { name: /submit request/i }));

    await waitFor(() => {
      expect(actor.registerProfile).toHaveBeenCalledWith(
        "Ada Lovelace",
        "ada@finance.gov",
        "Finance",
        "Analyst",
      );
    });
  });
});

describe("App directory and conversation journey for an Approved user", () => {
  it("lists registered users and distinguishes the signed-in user", async () => {
    renderApp();
    expect(await screen.findByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("This is you")).toBeInTheDocument();
  });

  it("opens a conversation from a directory entry's Message button", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Grace Hopper");

    await user.click(screen.getByRole("button", { name: /message/i }));

    await waitFor(() => {
      expect(actor.getThread).toHaveBeenCalledWith(OTHER);
    });
    expect(await screen.findByText(/no messages yet/i)).toBeInTheDocument();
  });

  it("shows a thread oldest-to-newest and sends a new message", async () => {
    const user = userEvent.setup();
    // The backend stores and returns plain text in `content`.
    vi.mocked(actor.getThread).mockResolvedValue([
      makeMessage(OTHER, ME, "first", 1_000_000_000n),
      makeMessage(ME, OTHER, "second", 2_000_000_000n),
    ]);
    vi.mocked(actor.sendMessage).mockResolvedValue(
      makeMessage(ME, OTHER, "third", 3_000_000_000n),
    );
    renderApp();
    await screen.findByText("Grace Hopper");
    await user.click(screen.getByRole("button", { name: /message/i }));

    const bubbles = await screen.findAllByText(/first|second/);
    expect(bubbles.map((node) => node.textContent)).toEqual([
      "first",
      "second",
    ]);

    const composer = screen.getByLabelText("Message");
    await user.type(composer, "third");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      // The plain text the user typed reaches the backend unchanged.
      expect(actor.sendMessage).toHaveBeenCalledWith(OTHER, "third");
    });
  });

  it("shows an empty state when no other users are approved", async () => {
    vi.mocked(actor.listDirectory).mockResolvedValue([
      makeEntry(ME, "Ada Lovelace"),
    ]);
    renderApp();
    expect(
      await screen.findByText(/no colleagues to message yet/i),
    ).toBeInTheDocument();
  });
});

describe("App sign-out", () => {
  it("clears the session when the user signs out", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Grace Hopper");

    await user.click(screen.getByRole("button", { name: /sign out/i }));

    expect(authState.clear).toHaveBeenCalled();
  });
});

describe("App access gating is preserved", () => {
  it("never shows the Directory to a non-approved user", async () => {
    vi.mocked(actor.getMyProfile).mockResolvedValue(
      makeProfile({ status: Status.pending }),
    );
    renderApp();

    // The status screen is the only surface a Pending user reaches; the entry
    // overlay must not let a non-approved user through to the Directory.
    expect(await screen.findByText(/awaiting approval/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /^Directory$/ }),
    ).not.toBeInTheDocument();
    expect(actor.listDirectory).not.toHaveBeenCalled();
  });

  it("shows the Directory to an approved user once the profile resolves", async () => {
    renderApp();

    expect(
      await screen.findByRole("heading", { name: /^Directory$/ }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Grace Hopper")).toBeInTheDocument();
  });
});

describe("entry video overlay after an approved sign-in", () => {
  const originalMatchMedia = window.matchMedia;

  function stubReducedMotion() {
    window.matchMedia = ((query: string) => ({
      matches: query.includes("(prefers-reduced-motion: reduce)"),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }

  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    window.sessionStorage.clear();
  });

  it("shows the overlay after a successful sign-in resolves to an approved profile", async () => {
    const user = userEvent.setup();
    // Start signed out on the Login page, then complete sign-in: the overlay
    // must appear on the transition, not only on a fresh authenticated mount.
    authState.isAuthenticated = false;
    const { rerender, queryClient } = renderAppAndSettle();
    await user.click(
      await screen.findByRole("button", { name: /unlock the vault/i }),
    );
    expect(
      await screen.findByRole("button", {
        name: /sign in with internet identity/i,
      }),
    ).toBeInTheDocument();

    authState.isAuthenticated = true;
    rerender(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole("button", {
        name: /skip the introduction video/i,
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: /^Directory$/ }),
    ).toBeInTheDocument();
  });

  it("shows a full-screen muted overlay over the Directory after sign-in", async () => {
    renderApp();

    const overlay = await screen.findByRole("button", {
      name: /skip the introduction video/i,
    });
    expect(overlay).toBeInTheDocument();
    // The Directory is already mounted beneath the overlay, so the fade reveals it.
    expect(
      await screen.findByRole("heading", { name: /^Directory$/ }),
    ).toBeInTheDocument();

    const video = overlay.querySelector("video");
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute("src", ENTRY_VIDEO_SRC);
    expect(video).toHaveProperty("muted", true);
    expect(video).toHaveAttribute("playsinline");
  });

  it("renders the entry video with no playback controls and no loop", async () => {
    renderApp();

    const overlay = await screen.findByRole("button", {
      name: /skip the introduction video/i,
    });
    const video = overlay.querySelector("video") as HTMLVideoElement;

    // The accepted clip plays once, from first frame to end, with no controls.
    expect(video).not.toHaveAttribute("controls");
    expect(video).not.toHaveAttribute("loop");
  });

  it("does not show the overlay to a first-time user with no profile", async () => {
    vi.mocked(actor.getMyProfile).mockResolvedValue(null);
    renderApp();

    expect(
      await screen.findByRole("heading", { name: /request access/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /skip the introduction video/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("dismisses the overlay on a tap and reveals the Directory", async () => {
    const user = userEvent.setup();
    renderApp();

    const overlay = await screen.findByRole("button", {
      name: /skip the introduction video/i,
    });
    await user.click(overlay);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", {
          name: /skip the introduction video/i,
        }),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", { name: /^Directory$/ }),
    ).toBeInTheDocument();
    expect(window.sessionStorage.getItem(ENTRY_VIDEO_SESSION_KEY)).toBe("1");
  });

  it("fades to the Directory when the video ends on its own", async () => {
    renderApp();

    const overlay = await screen.findByRole("button", {
      name: /skip the introduction video/i,
    });
    const video = overlay.querySelector("video") as HTMLVideoElement;

    fireEvent.ended(video);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", {
          name: /skip the introduction video/i,
        }),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", { name: /^Directory$/ }),
    ).toBeInTheDocument();
  });

  it("goes straight to the Directory with no overlay when the video errors", async () => {
    renderApp();

    const overlay = await screen.findByRole("button", {
      name: /skip the introduction video/i,
    });
    const video = overlay.querySelector("video") as HTMLVideoElement;

    fireEvent.error(video);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", {
          name: /skip the introduction video/i,
        }),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", { name: /^Directory$/ }),
    ).toBeInTheDocument();
  });

  it("does not show the overlay a second time within the same session", async () => {
    window.sessionStorage.setItem(ENTRY_VIDEO_SESSION_KEY, "1");
    renderApp();

    expect(
      await screen.findByRole("heading", { name: /^Directory$/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /skip the introduction video/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("skips the overlay entirely when the user prefers reduced motion", async () => {
    stubReducedMotion();
    renderApp();

    expect(
      await screen.findByRole("heading", { name: /^Directory$/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /skip the introduction video/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("never shows the overlay to a non-approved user", async () => {
    vi.mocked(actor.getMyProfile).mockResolvedValue(
      makeProfile({ status: Status.pending }),
    );
    renderApp();

    expect(await screen.findByText(/awaiting approval/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /skip the introduction video/i,
      }),
    ).not.toBeInTheDocument();
  });
});

describe("entry video explicit playback with one retry", () => {
  const originalPlay = HTMLMediaElement.prototype.play;
  let playSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.sessionStorage.clear();
    playSpy = vi.fn();
    HTMLMediaElement.prototype.play = playSpy as unknown as () => Promise<void>;
  });

  afterEach(() => {
    HTMLMediaElement.prototype.play = originalPlay;
    window.sessionStorage.clear();
  });

  it("starts playback explicitly when the overlay appears", async () => {
    playSpy.mockResolvedValue(undefined);
    renderApp();

    await screen.findByRole("button", {
      name: /skip the introduction video/i,
    });

    // The overlay must not rely on the autoPlay attribute alone.
    await waitFor(() => {
      expect(playSpy).toHaveBeenCalled();
    });
  });

  it("retries once when the first playback attempt is rejected", async () => {
    playSpy
      .mockRejectedValueOnce(new Error("autoplay blocked"))
      .mockResolvedValue(undefined);
    renderApp();

    await screen.findByRole("button", {
      name: /skip the introduction video/i,
    });

    // A rejection triggers a second attempt rather than an immediate fallback.
    await waitFor(() => {
      expect(playSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
    // The retry succeeded, so the overlay stays up rather than falling back.
    expect(
      screen.getByRole("button", { name: /skip the introduction video/i }),
    ).toBeInTheDocument();
  });

  it("falls back to the Directory when both playback attempts are rejected", async () => {
    playSpy.mockRejectedValue(new Error("autoplay blocked"));
    renderApp();

    await screen.findByRole("button", {
      name: /skip the introduction video/i,
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("button", {
          name: /skip the introduction video/i,
        }),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", { name: /^Directory$/ }),
    ).toBeInTheDocument();
  });
});
