import { Role, Status } from "@/backend";
import type { Profile, backendInterface } from "@/backend";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ME,
  OTHER,
  SUPER,
  THIRD,
  makeActor,
  makeProfile,
} from "@/__tests__/support";
import { AdminPage } from "@/pages/AdminPage";

/**
 * AdminPage journeys against a typed local actor mock. Scoping and
 * authorization are enforced by the backend; these tests check what the page
 * offers each role and how it reports a backend rejection.
 */

let actor: backendInterface;

vi.mock("@caffeineai/core-infrastructure", () => ({
  useInternetIdentity: () => ({}),
  useActor: () => ({ actor, isFetching: false }),
}));

const deptAdmin: Profile = makeProfile({
  principal: ME,
  fullName: "Dana Admin",
  role: Role.departmentAdmin,
  department: "Finance",
});

const superAdmin: Profile = makeProfile({
  principal: SUPER,
  fullName: "Super Admin",
  role: Role.superAdmin,
  department: "",
  workEmail: "",
});

const pendingUser: Profile = makeProfile({
  principal: OTHER,
  fullName: "Pat Pending",
  workEmail: "pat@finance.gov",
  status: Status.pending,
});

const memberUser: Profile = makeProfile({
  principal: THIRD,
  fullName: "Max Member",
  workEmail: "max@finance.gov",
});

const suspendedUser: Profile = makeProfile({
  principal: THIRD,
  fullName: "Max Member",
  workEmail: "max@finance.gov",
  department: "Finance",
  jobTitle: "Analyst",
  status: Status.suspended,
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
  actor = makeActor();
});

describe("Admin page for a Department Admin", () => {
  it("shows the department scope note, pending requests and approved users", async () => {
    vi.mocked(actor.listPendingRequests).mockResolvedValue([pendingUser]);
    vi.mocked(actor.listApprovedUsers).mockResolvedValue([
      deptAdmin,
      memberUser,
    ]);
    renderAdmin(deptAdmin);

    expect(await screen.findByText("Pat Pending")).toBeInTheDocument();
    expect(screen.getByText("Max Member")).toBeInTheDocument();
    expect(screen.getByText(/limited to the/i)).toHaveTextContent("Finance");
    expect(
      screen.getByRole("button", { name: /^Approve$/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Deny$/ })).toBeInTheDocument();
  });

  it("approves a pending request through approveUser and confirms it", async () => {
    const user = userEvent.setup();
    vi.mocked(actor.listPendingRequests).mockResolvedValue([pendingUser]);
    vi.mocked(actor.listApprovedUsers).mockResolvedValue([deptAdmin]);
    vi.mocked(actor.approveUser).mockResolvedValue({
      ...pendingUser,
      status: Status.approved,
    });
    renderAdmin(deptAdmin);

    await user.click(await screen.findByRole("button", { name: /^Approve$/ }));

    await waitFor(() => {
      expect(actor.approveUser).toHaveBeenCalledWith(OTHER);
    });
    expect(
      await screen.findByText("Pat Pending has been approved."),
    ).toBeInTheDocument();
  });

  it("denies a pending request through denyUser", async () => {
    const user = userEvent.setup();
    vi.mocked(actor.listPendingRequests).mockResolvedValue([pendingUser]);
    vi.mocked(actor.listApprovedUsers).mockResolvedValue([deptAdmin]);
    vi.mocked(actor.denyUser).mockResolvedValue({
      ...pendingUser,
      status: Status.denied,
    });
    renderAdmin(deptAdmin);

    await user.click(await screen.findByRole("button", { name: /^Deny$/ }));

    await waitFor(() => {
      expect(actor.denyUser).toHaveBeenCalledWith(OTHER);
    });
  });

  it("suspends an approved member but offers no action on itself", async () => {
    const user = userEvent.setup();
    vi.mocked(actor.listApprovedUsers).mockResolvedValue([
      deptAdmin,
      memberUser,
    ]);
    vi.mocked(actor.suspendUser).mockResolvedValue({
      ...memberUser,
      status: Status.suspended,
    });
    renderAdmin(deptAdmin);

    await screen.findByText("Max Member");
    const suspendButtons = screen.getAllByRole("button", { name: /^Suspend$/ });
    expect(suspendButtons).toHaveLength(1);
    await user.click(suspendButtons[0]);

    await waitFor(() => {
      expect(actor.suspendUser).toHaveBeenCalledWith(THIRD);
    });
  });

  it("does not offer Super Admin-only actions", async () => {
    vi.mocked(actor.listApprovedUsers).mockResolvedValue([
      deptAdmin,
      memberUser,
    ]);
    renderAdmin(deptAdmin);
    await screen.findByText("Max Member");

    expect(
      screen.queryByRole("button", { name: /appoint department admin/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /mark demo/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the backend rejection when acting on another department's user", async () => {
    const user = userEvent.setup();
    vi.mocked(actor.listPendingRequests).mockResolvedValue([pendingUser]);
    vi.mocked(actor.listApprovedUsers).mockResolvedValue([deptAdmin]);
    vi.mocked(actor.approveUser).mockRejectedValue(
      new Error("Access denied: user belongs to another department"),
    );
    renderAdmin(deptAdmin);

    await user.click(await screen.findByRole("button", { name: /^Approve$/ }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Access denied: user belongs to another department",
    );
  });

  it("shows empty states when there is nothing to review", async () => {
    renderAdmin(deptAdmin);
    expect(await screen.findByText("No pending requests")).toBeInTheDocument();
    expect(screen.getByText("No approved users yet")).toBeInTheDocument();
  });
});

describe("Admin page suspended users section", () => {
  it("lists suspended users so an admin can reinstate them", async () => {
    vi.mocked(actor.listSuspendedUsers).mockResolvedValue([suspendedUser]);
    renderAdmin(deptAdmin);

    expect(await screen.findByText("Max Member")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Reinstate$/ }),
    ).toBeInTheDocument();
  });

  it("shows an empty state when nobody is suspended", async () => {
    renderAdmin(deptAdmin);
    expect(await screen.findByText("No suspended users")).toBeInTheDocument();
  });

  it("reinstates a suspended user through reinstateUser and confirms it", async () => {
    const user = userEvent.setup();
    vi.mocked(actor.listSuspendedUsers).mockResolvedValue([suspendedUser]);
    vi.mocked(actor.reinstateUser).mockResolvedValue({
      ...suspendedUser,
      status: Status.approved,
    });
    renderAdmin(deptAdmin);

    await user.click(
      await screen.findByRole("button", { name: /^Reinstate$/ }),
    );

    await waitFor(() => {
      expect(actor.reinstateUser).toHaveBeenCalledWith(THIRD);
    });
    expect(
      await screen.findByText("Max Member has been reinstated."),
    ).toBeInTheDocument();
  });

  it("reports a backend rejection when reinstating fails", async () => {
    const user = userEvent.setup();
    vi.mocked(actor.listSuspendedUsers).mockResolvedValue([suspendedUser]);
    vi.mocked(actor.reinstateUser).mockRejectedValue(
      new Error("Access denied: user belongs to another department"),
    );
    renderAdmin(deptAdmin);

    await user.click(
      await screen.findByRole("button", { name: /^Reinstate$/ }),
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Access denied: user belongs to another department",
    );
  });

  it("offers no Reinstate action on the Super Admin's own row", async () => {
    vi.mocked(actor.listSuspendedUsers).mockResolvedValue([
      { ...superAdmin, status: Status.suspended },
    ]);
    renderAdmin(superAdmin);

    await screen.findByText("Suspended users");
    await waitFor(() =>
      expect(screen.getAllByText("Super Admin").length).toBeGreaterThan(0),
    );
    expect(
      screen.queryByRole("button", { name: /^Reinstate$/ }),
    ).not.toBeInTheDocument();
  });
});

describe("Admin page for the Super Admin", () => {
  const demoUser: Profile = { ...memberUser, isDemo: true };
  const otherAdmin: Profile = makeProfile({
    principal: OTHER,
    fullName: "Olly Admin",
    role: Role.departmentAdmin,
    department: "Health",
  });

  it("has no scope note and offers appoint, demo and suspend on others", async () => {
    vi.mocked(actor.listApprovedUsers).mockResolvedValue([
      superAdmin,
      memberUser,
    ]);
    renderAdmin(superAdmin);
    await screen.findByText("Max Member");

    expect(screen.queryByText(/limited to the/i)).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /appoint department admin/i }),
    ).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /mark demo/i })).toHaveLength(
      1,
    );
    // The Super Admin row itself carries no actions.
    expect(screen.getAllByRole("button", { name: /^Suspend$/ })).toHaveLength(
      1,
    );
  });

  it("appoints a Department Admin through appointDepartmentAdmin", async () => {
    const user = userEvent.setup();
    vi.mocked(actor.listApprovedUsers).mockResolvedValue([
      superAdmin,
      memberUser,
    ]);
    vi.mocked(actor.appointDepartmentAdmin).mockResolvedValue({
      ...memberUser,
      role: Role.departmentAdmin,
    });
    renderAdmin(superAdmin);

    await user.click(
      await screen.findByRole("button", { name: /appoint department admin/i }),
    );

    await waitFor(() => {
      expect(actor.appointDepartmentAdmin).toHaveBeenCalledWith(THIRD);
    });
  });

  it("removes a Department Admin through removeDepartmentAdmin", async () => {
    const user = userEvent.setup();
    vi.mocked(actor.listApprovedUsers).mockResolvedValue([
      superAdmin,
      otherAdmin,
    ]);
    vi.mocked(actor.removeDepartmentAdmin).mockResolvedValue({
      ...otherAdmin,
      role: Role.member,
    });
    renderAdmin(superAdmin);

    await user.click(
      await screen.findByRole("button", {
        name: /remove department admin/i,
      }),
    );

    await waitFor(() => {
      expect(actor.removeDepartmentAdmin).toHaveBeenCalledWith(OTHER);
    });
  });

  it("marks and unmarks Demo accounts through setDemoAccount", async () => {
    const user = userEvent.setup();
    vi.mocked(actor.listApprovedUsers).mockResolvedValue([
      superAdmin,
      memberUser,
    ]);
    vi.mocked(actor.setDemoAccount).mockResolvedValue(demoUser);
    renderAdmin(superAdmin);

    await user.click(await screen.findByRole("button", { name: /mark demo/i }));
    await waitFor(() => {
      expect(actor.setDemoAccount).toHaveBeenCalledWith(THIRD, true);
    });
  });

  it("shows the DEMO badge next to a demo account's name and offers Unmark", async () => {
    const user = userEvent.setup();
    vi.mocked(actor.listApprovedUsers).mockResolvedValue([
      superAdmin,
      demoUser,
    ]);
    vi.mocked(actor.setDemoAccount).mockResolvedValue(memberUser);
    renderAdmin(superAdmin);

    const name = await screen.findByText("Max Member");
    const row = name.closest("li") as HTMLElement;
    expect(within(row).getByText("DEMO")).toBeInTheDocument();

    await user.click(within(row).getByRole("button", { name: /unmark demo/i }));
    await waitFor(() => {
      expect(actor.setDemoAccount).toHaveBeenCalledWith(THIRD, false);
    });
  });
});
