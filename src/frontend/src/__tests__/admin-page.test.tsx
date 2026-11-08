import { InviteStatus, Role, Status } from "@/backend";
import type { Invite, Profile, backendInterface } from "@/backend";
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

/** A typed invite fixture; the backend owns the real token and code values. */
function makeInvite(overrides: Partial<Invite> = {}): Invite {
  return {
    id: 1n,
    status: InviteStatus.pending,
    expiresAt: 1_700_000_000_000_000_000n,
    workEmail: "new.staff@finance.gov",
    code: "123456",
    createdAt: 1_700_000_000_000_000_000n,
    createdBy: ME,
    role: Role.member,
    fullName: "New Staff",
    wrongCodeAttempts: 0n,
    linkToken: "inv-1-1700000000000000000",
    phone: "+1 555 010 4477",
    department: "Finance",
    ...overrides,
  };
}

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

  it("keeps the existing review sections present for a Department Admin", async () => {
    // The accepted change adds invite sections to this page; the existing
    // pending/approved/suspended sections must remain reachable alongside them.
    renderAdmin(deptAdmin);

    expect(
      await screen.findByRole("heading", { name: "Pending requests" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Approved users" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Suspended users" }),
    ).toBeInTheDocument();
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

describe("Admin page invite creation", () => {
  it("creates an invite and shows the single-use link and the separate 6-digit code", async () => {
    const user = userEvent.setup();
    vi.mocked(actor.listPendingRequests).mockResolvedValue([]);
    vi.mocked(actor.listApprovedUsers).mockResolvedValue([superAdmin]);
    vi.mocked(actor.listInvites).mockResolvedValue([]);
    const created = makeInvite({
      fullName: "New Staff",
      workEmail: "new.staff@finance.gov",
      phone: "+1 555 010 4477",
      department: "Finance",
      role: Role.member,
      linkToken: "inv-1-1700000000000000000",
      code: "123456",
    });
    vi.mocked(actor.createInvite).mockResolvedValue(created);
    renderAdmin(superAdmin);

    await user.type(await screen.findByLabelText(/full name/i), "New Staff");
    await user.type(
      screen.getByLabelText(/work email/i),
      "new.staff@finance.gov",
    );
    await user.type(screen.getByLabelText(/phone number/i), "+1 555 010 4477");
    await user.type(screen.getByLabelText(/department/i), "Finance");
    await user.click(screen.getByRole("button", { name: /create invite/i }));

    await waitFor(() => {
      expect(actor.createInvite).toHaveBeenCalledWith(
        "New Staff",
        "new.staff@finance.gov",
        "+1 555 010 4477",
        "Finance",
        Role.member,
      );
    });

    // The link and the code are shown as two separate values.
    const link = await screen.findByLabelText(/invite link/i, {
      selector: "input",
    });
    expect((link as HTMLInputElement).value).toContain(
      "inv-1-1700000000000000000",
    );
    const code = screen.getByLabelText(/6-digit code/i, { selector: "input" });
    expect(code).toHaveValue("123456");
    expect(screen.getByText(/invite ready for new staff/i)).toBeInTheDocument();
  });

  it("reports a backend rejection without showing a link or code", async () => {
    const user = userEvent.setup();
    vi.mocked(actor.listPendingRequests).mockResolvedValue([]);
    vi.mocked(actor.listApprovedUsers).mockResolvedValue([superAdmin]);
    vi.mocked(actor.listInvites).mockResolvedValue([]);
    vi.mocked(actor.createInvite).mockRejectedValue(
      new Error("Only a Super Admin may grant the Super Admin role."),
    );
    renderAdmin(superAdmin);

    await user.type(await screen.findByLabelText(/full name/i), "New Staff");
    await user.type(
      screen.getByLabelText(/work email/i),
      "new.staff@finance.gov",
    );
    await user.type(screen.getByLabelText(/phone number/i), "+1 555 010 4477");
    await user.type(screen.getByLabelText(/department/i), "Finance");
    await user.click(screen.getByRole("button", { name: /create invite/i }));

    expect(
      await screen.findByText(/only a super admin may grant/i),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/invite link/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/6-digit code/i)).not.toBeInTheDocument();
  });

  it("locks a Department Admin to their own department and hides the Super Admin role", async () => {
    vi.mocked(actor.listPendingRequests).mockResolvedValue([]);
    vi.mocked(actor.listApprovedUsers).mockResolvedValue([deptAdmin]);
    vi.mocked(actor.listInvites).mockResolvedValue([]);
    renderAdmin(deptAdmin);

    const department = await screen.findByLabelText(/department/i);
    expect(department).toHaveValue("Finance");
    expect(department).toHaveAttribute("readonly");
    expect(screen.getByText(/locked to your department/i)).toBeInTheDocument();

    const role = screen.getByLabelText(/role/i);
    const options = within(role).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "Member",
      "Department Admin",
    ]);
  });

  it("lets a Super Admin choose any department and grant the Super Admin role", async () => {
    vi.mocked(actor.listPendingRequests).mockResolvedValue([]);
    vi.mocked(actor.listApprovedUsers).mockResolvedValue([superAdmin]);
    vi.mocked(actor.listInvites).mockResolvedValue([]);
    renderAdmin(superAdmin);

    const department = await screen.findByLabelText(/department/i);
    expect(department).not.toHaveAttribute("readonly");
    expect(department).toHaveValue("");

    const role = screen.getByLabelText(/role/i);
    const options = within(role).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "Member",
      "Department Admin",
      "Super Admin",
    ]);
  });
});

describe("Admin page invite list", () => {
  it("lists every invite with its status, creator and creation time", async () => {
    vi.mocked(actor.listPendingRequests).mockResolvedValue([]);
    vi.mocked(actor.listApprovedUsers).mockResolvedValue([superAdmin]);
    vi.mocked(actor.listInvites).mockResolvedValue([
      makeInvite({
        id: 1n,
        fullName: "Pending Person",
        status: InviteStatus.pending,
        createdBy: SUPER,
      }),
      makeInvite({
        id: 2n,
        fullName: "Used Person",
        status: InviteStatus.used,
        createdBy: SUPER,
      }),
      makeInvite({
        id: 3n,
        fullName: "Expired Person",
        status: InviteStatus.expired,
        createdBy: SUPER,
      }),
      makeInvite({
        id: 4n,
        fullName: "Cancelled Person",
        status: InviteStatus.cancelled,
        createdBy: SUPER,
      }),
    ]);
    renderAdmin(superAdmin);

    expect(await screen.findByText("Pending Person")).toBeInTheDocument();
    expect(screen.getByText("Used Person")).toBeInTheDocument();
    expect(screen.getByText("Expired Person")).toBeInTheDocument();
    expect(screen.getByText("Cancelled Person")).toBeInTheDocument();

    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Used")).toBeInTheDocument();
    expect(screen.getByText("Expired")).toBeInTheDocument();
    expect(screen.getByText("Cancelled")).toBeInTheDocument();

    // The creator and the creation time are shown for each invite.
    expect(screen.getAllByText(/created by/i).length).toBe(4);
    expect(screen.getAllByText(/on /i).length).toBeGreaterThanOrEqual(4);
  });

  it("cancels a pending invite and leaves non-pending invites without a cancel action", async () => {
    const user = userEvent.setup();
    vi.mocked(actor.listPendingRequests).mockResolvedValue([]);
    vi.mocked(actor.listApprovedUsers).mockResolvedValue([superAdmin]);
    vi.mocked(actor.listInvites).mockResolvedValue([
      makeInvite({ id: 1n, fullName: "Pending Person" }),
      makeInvite({
        id: 2n,
        fullName: "Used Person",
        status: InviteStatus.used,
      }),
    ]);
    vi.mocked(actor.cancelInvite).mockResolvedValue(
      makeInvite({
        id: 1n,
        fullName: "Pending Person",
        status: InviteStatus.cancelled,
      }),
    );
    renderAdmin(superAdmin);

    const pendingRow = (await screen.findByText("Pending Person")).closest(
      "li",
    ) as HTMLElement;
    const usedRow = screen
      .getByText("Used Person")
      .closest("li") as HTMLElement;

    // Only the pending invite offers a cancel action.
    expect(
      within(pendingRow).getByRole("button", { name: /cancel/i }),
    ).toBeInTheDocument();
    expect(
      within(usedRow).queryByRole("button", { name: /cancel/i }),
    ).not.toBeInTheDocument();

    await user.click(
      within(pendingRow).getByRole("button", { name: /cancel/i }),
    );
    await waitFor(() => {
      expect(actor.cancelInvite).toHaveBeenCalledWith(1n);
    });
  });
});
