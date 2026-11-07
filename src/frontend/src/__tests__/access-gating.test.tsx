import { Role, Status } from "@/backend";
import type { backendInterface } from "@/backend";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AWAITING_MESSAGE,
  ME,
  OTHER,
  SUPER,
  makeActor,
  makeEntry,
  makeMessage,
  makeProfile,
  renderApp,
} from "@/__tests__/support";
import { profileKeys } from "@/hooks/useProfile";

/**
 * Component/integration journeys for approval gating. The backend actor is a
 * typed local mock: these tests prove what the UI does with each status/role,
 * not that the real canister enforces it.
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

describe("signed-out visitors", () => {
  it("reach Login and About without touching gated backend methods", async () => {
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
    await user.click(
      screen.getByRole("button", { name: /about this service/i }),
    );
    expect(
      await screen.findByRole("heading", {
        name: /independent infrastructure/i,
      }),
    ).toBeInTheDocument();
    expect(actor.listDirectory).not.toHaveBeenCalled();
    expect(actor.listPendingRequests).not.toHaveBeenCalled();
  });
});

describe("Super Admin", () => {
  it("lands on the directory as Approved and can open the Admin page", async () => {
    const user = userEvent.setup();
    vi.mocked(actor.getMyProfile).mockResolvedValue(
      makeProfile({
        principal: SUPER,
        fullName: "Super Admin",
        role: Role.superAdmin,
        status: Status.approved,
      }),
    );
    vi.mocked(actor.listDirectory).mockResolvedValue([
      makeEntry(SUPER, "Super Admin"),
      makeEntry(OTHER, "Grace Hopper"),
    ]);
    renderApp();

    expect(
      await screen.findByRole("heading", { name: /^Directory$/ }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.queryByText(AWAITING_MESSAGE)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Admin$/ }));
    expect(
      await screen.findByRole("heading", { name: /administration/i }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(actor.listPendingRequests).toHaveBeenCalled();
    });
    expect(actor.listApprovedUsers).toHaveBeenCalled();
  });
});

describe("new user sign-up", () => {
  it("lands on the status screen as Pending with only the awaiting message", async () => {
    const user = userEvent.setup();
    const pending = makeProfile({ status: Status.pending });
    vi.mocked(actor.getMyProfile)
      .mockResolvedValueOnce(null)
      .mockResolvedValue(pending);
    vi.mocked(actor.registerProfile).mockResolvedValue(pending);
    renderApp();

    await user.type(await screen.findByLabelText(/full name/i), "Ada Lovelace");
    await user.type(screen.getByLabelText(/work email/i), "ada@finance.gov");
    await user.type(screen.getByLabelText(/department or team/i), "Finance");
    await user.type(screen.getByLabelText(/job title/i), "Analyst");
    await user.click(screen.getByRole("button", { name: /submit request/i }));

    expect(await screen.findByText(AWAITING_MESSAGE)).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /^Directory$/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^(Directory|Admin)$/ }),
    ).not.toBeInTheDocument();
    expect(actor.listDirectory).not.toHaveBeenCalled();
    expect(actor.getThread).not.toHaveBeenCalled();
  });

  it("validates the sign-up form and does not call the backend when fields are empty", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(
      await screen.findByRole("button", { name: /submit request/i }),
    );
    expect((await screen.findAllByText("This field is required.")).length).toBe(
      4,
    );
    expect(actor.registerProfile).not.toHaveBeenCalled();
  });

  it("rejects a malformed work email in the sign-up form", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.type(await screen.findByLabelText(/full name/i), "Ada");
    await user.type(screen.getByLabelText(/work email/i), "not-an-email");
    await user.type(screen.getByLabelText(/department or team/i), "Fin");
    await user.type(screen.getByLabelText(/job title/i), "Analyst");
    await user.click(screen.getByRole("button", { name: /submit request/i }));
    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
    expect(actor.registerProfile).not.toHaveBeenCalled();
  });
});

describe("non-Approved users see only the status screen", () => {
  it.each([
    [Status.pending, null],
    [Status.denied, "Denied"],
    [Status.suspended, "Suspended"],
  ])("for a %s user", async (status, badge) => {
    vi.mocked(actor.getMyProfile).mockResolvedValue(
      makeProfile({ status, fullName: "Ada Lovelace" }),
    );
    renderApp();

    expect(await screen.findByText(AWAITING_MESSAGE)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Ada Lovelace" }),
    ).toBeInTheDocument();
    if (badge) {
      expect(screen.getByText(badge)).toBeInTheDocument();
    }
    expect(
      screen.queryByRole("heading", { name: /^Directory$/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^(Directory|About|Admin)$/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeVisible();
    expect(actor.listDirectory).not.toHaveBeenCalled();
    expect(actor.getThread).not.toHaveBeenCalled();
    expect(actor.listPendingRequests).not.toHaveBeenCalled();
  });

  it("offers no Admin link even for a suspended former Department Admin", async () => {
    vi.mocked(actor.getMyProfile).mockResolvedValue(
      makeProfile({ status: Status.suspended, role: Role.departmentAdmin }),
    );
    renderApp();
    await screen.findByText(AWAITING_MESSAGE);
    expect(
      screen.queryByRole("button", { name: /^Admin$/ }),
    ).not.toBeInTheDocument();
  });
});

describe("Admin link visibility for Approved users", () => {
  it("is hidden from a Member", async () => {
    vi.mocked(actor.getMyProfile).mockResolvedValue(makeProfile());
    renderApp();
    await screen.findByRole("heading", { name: /^Directory$/ });
    expect(
      screen.queryByRole("button", { name: /^Admin$/ }),
    ).not.toBeInTheDocument();
    expect(actor.listPendingRequests).not.toHaveBeenCalled();
  });

  it("is shown to a Department Admin", async () => {
    vi.mocked(actor.getMyProfile).mockResolvedValue(
      makeProfile({ role: Role.departmentAdmin }),
    );
    renderApp();
    await screen.findByRole("heading", { name: /^Directory$/ });
    expect(screen.getByRole("button", { name: /^Admin$/ })).toBeInTheDocument();
  });
});

describe("approval lifecycle as seen by the user", () => {
  it("gains directory access after approval and loses it after suspension", async () => {
    const pending = makeProfile({ status: Status.pending });
    const approved = makeProfile({ status: Status.approved });
    const suspended = makeProfile({ status: Status.suspended });
    vi.mocked(actor.getMyProfile).mockResolvedValue(pending);
    vi.mocked(actor.listDirectory).mockResolvedValue([
      makeEntry(ME, "Ada Lovelace"),
      makeEntry(OTHER, "Grace Hopper"),
    ]);
    const { queryClient } = renderApp();

    expect(await screen.findByText(AWAITING_MESSAGE)).toBeInTheDocument();
    expect(actor.listDirectory).not.toHaveBeenCalled();

    vi.mocked(actor.getMyProfile).mockResolvedValue(approved);
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: profileKeys.me });
    });
    expect(await screen.findByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.queryByText(AWAITING_MESSAGE)).not.toBeInTheDocument();

    vi.mocked(actor.getMyProfile).mockResolvedValue(suspended);
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: profileKeys.me });
    });
    expect(await screen.findByText(AWAITING_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText("Grace Hopper")).not.toBeInTheDocument();
  });
});

describe("DEMO badge", () => {
  it("shows next to a demo account in the directory but not others", async () => {
    vi.mocked(actor.getMyProfile).mockResolvedValue(makeProfile());
    vi.mocked(actor.listDirectory).mockResolvedValue([
      makeEntry(ME, "Ada Lovelace"),
      makeEntry(OTHER, "Grace Hopper", true),
    ]);
    renderApp();
    await screen.findByText("Grace Hopper");
    const ada = document.querySelector(
      "[data-ocid='directory.item.1']",
    ) as HTMLElement;
    const grace = document.querySelector(
      "[data-ocid='directory.item.2']",
    ) as HTMLElement;
    expect(within(grace).getByText("Grace Hopper")).toBeInTheDocument();
    expect(within(grace).getByText("Demo")).toBeInTheDocument();
    expect(within(ada).getByText("Ada Lovelace")).toBeInTheDocument();
    expect(within(ada).queryByText("Demo")).not.toBeInTheDocument();
  });

  it("shows in the conversation header for a demo recipient", async () => {
    const user = userEvent.setup();
    vi.mocked(actor.getMyProfile).mockResolvedValue(makeProfile());
    vi.mocked(actor.listDirectory).mockResolvedValue([
      makeEntry(ME, "Ada Lovelace"),
      makeEntry(OTHER, "Grace Hopper", true),
    ]);
    vi.mocked(actor.getThread).mockResolvedValue([
      makeMessage(OTHER, ME, "hello", 1_000_000_000n),
    ]);
    renderApp();
    await screen.findByText("Grace Hopper");
    await user.click(screen.getByRole("button", { name: /message/i }));
    await screen.findByText("hello");

    // One badge in the directory row plus one in the conversation header.
    expect(screen.getAllByText("Demo")).toHaveLength(2);
  });
});
