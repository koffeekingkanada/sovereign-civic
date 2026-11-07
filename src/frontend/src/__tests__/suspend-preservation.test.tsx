import { Role, Status } from "@/backend";
import type { Profile, backendInterface } from "@/backend";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ME,
  OTHER,
  SUPER,
  THIRD,
  makeActor,
  makeEntry,
  makeMessage,
  makeProfile,
  renderApp,
} from "@/__tests__/support";
import { AdminPage } from "@/pages/AdminPage";

/**
 * Characterization baseline for behavior the Reinstate request must not change:
 * the default route renders content (never a blank screen), and suspending a
 * user preserves their profile identity and their existing messages. The actor
 * is a typed local mock, so this proves the UI/consumer contract only.
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

const superAdmin: Profile = makeProfile({
  principal: SUPER,
  fullName: "Super Admin",
  role: Role.superAdmin,
  department: "",
  workEmail: "",
});

const memberUser: Profile = makeProfile({
  principal: THIRD,
  fullName: "Max Member",
  workEmail: "max@finance.gov",
  department: "Finance",
  jobTitle: "Analyst",
});

function renderAdmin(profile: Profile) {
  vi.mocked(actor.getMyProfile).mockResolvedValue(profile);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminPage profile={profile} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  authState.isAuthenticated = true;
  authState.isInitializing = false;
  actor = makeActor();
});

describe("default route renders content", () => {
  it("shows the directory, not a blank screen, for an approved user", async () => {
    vi.mocked(actor.getMyProfile).mockResolvedValue(makeProfile());
    vi.mocked(actor.listDirectory).mockResolvedValue([
      makeEntry(ME, "Ada Lovelace"),
      makeEntry(OTHER, "Grace Hopper"),
    ]);
    renderApp();

    expect(
      await screen.findByRole("heading", { name: /^Directory$/ }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Grace Hopper")).toBeInTheDocument();
    expect(document.body.textContent?.trim().length ?? 0).toBeGreaterThan(0);
  });
});

describe("suspending a user preserves their profile", () => {
  it("keeps every identity field and only changes status and role", async () => {
    const user = userEvent.setup();
    vi.mocked(actor.listApprovedUsers).mockResolvedValue([
      superAdmin,
      memberUser,
    ]);
    vi.mocked(actor.suspendUser).mockResolvedValue({
      ...memberUser,
      status: Status.suspended,
      role: Role.member,
    });
    renderAdmin(superAdmin);

    await screen.findByText("Max Member");
    await user.click(screen.getByRole("button", { name: /^Suspend$/ }));

    await waitFor(() => {
      expect(actor.suspendUser).toHaveBeenCalledWith(THIRD);
    });

    const returned = await vi.mocked(actor.suspendUser).mock.results[0].value;
    expect(returned).toMatchObject({
      principal: THIRD,
      fullName: "Max Member",
      workEmail: "max@finance.gov",
      department: "Finance",
      jobTitle: "Analyst",
      status: Status.suspended,
    });
  });

  it("confirms the suspension without removing the row's identity", async () => {
    const user = userEvent.setup();
    vi.mocked(actor.listApprovedUsers).mockResolvedValue([
      superAdmin,
      memberUser,
    ]);
    vi.mocked(actor.suspendUser).mockResolvedValue({
      ...memberUser,
      status: Status.suspended,
      role: Role.member,
    });
    renderAdmin(superAdmin);

    await screen.findByText("Max Member");
    await user.click(screen.getByRole("button", { name: /^Suspend$/ }));

    expect(
      await screen.findByText("Max Member has been suspended."),
    ).toBeInTheDocument();
    expect(screen.getByText("Max Member")).toBeInTheDocument();
    expect(screen.getByText("max@finance.gov")).toBeInTheDocument();
  });
});

describe("suspending a user preserves their messages", () => {
  it("still returns the prior thread after a peer is suspended", async () => {
    const user = userEvent.setup();
    vi.mocked(actor.getMyProfile).mockResolvedValue(makeProfile());
    vi.mocked(actor.listDirectory).mockResolvedValue([
      makeEntry(ME, "Ada Lovelace"),
      makeEntry(OTHER, "Grace Hopper"),
    ]);
    vi.mocked(actor.getThread).mockResolvedValue([
      makeMessage(OTHER, ME, "before suspension", 1_000_000_000n),
    ]);
    renderApp();

    await screen.findByText("Grace Hopper");
    await user.click(screen.getByRole("button", { name: /message/i }));

    expect(await screen.findByText("before suspension")).toBeInTheDocument();
    expect(actor.getThread).toHaveBeenCalledWith(OTHER);
  });
});

describe("reinstating a user preserves their profile and messages", () => {
  const suspendedMember: Profile = makeProfile({
    principal: THIRD,
    fullName: "Max Member",
    workEmail: "max@finance.gov",
    department: "Finance",
    jobTitle: "Analyst",
    status: Status.suspended,
  });

  it("keeps every identity field and only changes status back to Approved", async () => {
    const user = userEvent.setup();
    vi.mocked(actor.listSuspendedUsers).mockResolvedValue([suspendedMember]);
    vi.mocked(actor.reinstateUser).mockResolvedValue({
      ...suspendedMember,
      status: Status.approved,
    });
    renderAdmin(superAdmin);

    await screen.findByText("Max Member");
    await user.click(screen.getByRole("button", { name: /^Reinstate$/ }));

    await waitFor(() => {
      expect(actor.reinstateUser).toHaveBeenCalledWith(THIRD);
    });

    const returned = await vi.mocked(actor.reinstateUser).mock.results[0].value;
    expect(returned).toMatchObject({
      principal: THIRD,
      fullName: "Max Member",
      workEmail: "max@finance.gov",
      department: "Finance",
      jobTitle: "Analyst",
      status: Status.approved,
    });
  });

  it("still returns the prior thread after a peer is reinstated", async () => {
    const user = userEvent.setup();
    vi.mocked(actor.getMyProfile).mockResolvedValue(makeProfile());
    vi.mocked(actor.listDirectory).mockResolvedValue([
      makeEntry(ME, "Ada Lovelace"),
      makeEntry(OTHER, "Grace Hopper"),
    ]);
    vi.mocked(actor.getThread).mockResolvedValue([
      makeMessage(OTHER, ME, "before reinstatement", 1_000_000_000n),
    ]);
    renderApp();

    await screen.findByText("Grace Hopper");
    await user.click(screen.getByRole("button", { name: /message/i }));

    expect(await screen.findByText("before reinstatement")).toBeInTheDocument();
    expect(actor.getThread).toHaveBeenCalledWith(OTHER);
  });
});
