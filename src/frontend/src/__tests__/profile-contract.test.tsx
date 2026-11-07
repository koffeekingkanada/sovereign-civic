import { Role, Status } from "@/backend";
import type { DirectoryEntry, Message, backendInterface } from "@/backend";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ME, OTHER, THIRD, makeActor, makeProfile } from "@/__tests__/support";
import {
  useAppointDepartmentAdmin,
  useApproveUser,
  useApprovedUsers,
  useDenyUser,
  useIsAdmin,
  usePendingRequests,
  useRemoveDepartmentAdmin,
  useSetDemoAccount,
  useSuspendUser,
} from "@/hooks/useAdmin";
import {
  useDirectory,
  useIsApproved,
  useMyProfile,
  useRegisterProfile,
  useSendMessage,
  useThread,
} from "@/hooks/useProfile";

let actor: backendInterface;

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor, isFetching: false }),
  useInternetIdentity: () => ({}),
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  actor = makeActor();
});

describe("profile hook consumer contract", () => {
  it("reads the signed-in profile through getMyProfile", async () => {
    const profile = makeProfile();
    vi.mocked(actor.getMyProfile).mockResolvedValue(profile);

    const { result } = renderHook(() => useMyProfile(true), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(profile));
    expect(actor.getMyProfile).toHaveBeenCalledTimes(1);
  });

  it("lists the directory through listDirectory once Approved", async () => {
    vi.mocked(actor.getMyProfile).mockResolvedValue(makeProfile());
    const entries: DirectoryEntry[] = [
      { principal: OTHER, displayName: "Grace", isDemo: true },
    ];
    vi.mocked(actor.listDirectory).mockResolvedValue(entries);

    const { result } = renderHook(() => useDirectory(true), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(entries));
    expect(actor.listDirectory).toHaveBeenCalledTimes(1);
  });

  it("reads a thread through getThread with the other principal once Approved", async () => {
    vi.mocked(actor.getMyProfile).mockResolvedValue(makeProfile());
    const messages: Message[] = [
      { sender: OTHER, recipient: ME, content: "hi", timestamp: 1n },
    ];
    vi.mocked(actor.getThread).mockResolvedValue(messages);

    const { result } = renderHook(() => useThread(OTHER, true), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(messages));
    expect(actor.getThread).toHaveBeenCalledWith(OTHER);
  });

  it("sends a message through sendMessage with recipient and plain text", async () => {
    const sent: Message = {
      sender: ME,
      recipient: OTHER,
      content: "hello",
      timestamp: 2n,
    };
    vi.mocked(actor.sendMessage).mockResolvedValue(sent);

    const { result } = renderHook(() => useSendMessage(OTHER), { wrapper });
    await result.current.mutateAsync("hello");

    expect(actor.sendMessage).toHaveBeenCalledWith(OTHER, "hello");
  });

  it("registers the four sign-up fields through registerProfile", async () => {
    vi.mocked(actor.registerProfile).mockResolvedValue(
      makeProfile({ status: Status.pending }),
    );

    const { result } = renderHook(() => useRegisterProfile(), { wrapper });
    await result.current.mutateAsync({
      fullName: "Ada",
      workEmail: "ada@finance.gov",
      department: "Finance",
      jobTitle: "Analyst",
    });

    expect(actor.registerProfile).toHaveBeenCalledWith(
      "Ada",
      "ada@finance.gov",
      "Finance",
      "Analyst",
    );
  });
});

describe("approval gating in the data hooks", () => {
  it.each([Status.pending, Status.denied, Status.suspended])(
    "does not call listDirectory or getThread for a %s user",
    async (status) => {
      vi.mocked(actor.getMyProfile).mockResolvedValue(makeProfile({ status }));

      const { result } = renderHook(
        () => ({
          approved: useIsApproved(),
          profile: useMyProfile(true),
          directory: useDirectory(true),
          thread: useThread(OTHER, true),
        }),
        { wrapper },
      );

      await waitFor(() => expect(result.current.profile.isSuccess).toBe(true));
      expect(result.current.approved).toBe(false);
      expect(actor.listDirectory).not.toHaveBeenCalled();
      expect(actor.getThread).not.toHaveBeenCalled();
    },
  );
});

describe("admin hook consumer contract", () => {
  it.each([
    [Status.approved, Role.superAdmin, true],
    [Status.approved, Role.departmentAdmin, true],
    [Status.approved, Role.member, false],
    [Status.pending, Role.member, false],
    [Status.suspended, Role.departmentAdmin, false],
    [Status.denied, Role.member, false],
  ])(
    "useIsAdmin for status %s and role %s is %s",
    async (status, role, expected) => {
      vi.mocked(actor.getMyProfile).mockResolvedValue(
        makeProfile({ status, role }),
      );
      const { result } = renderHook(
        () => ({ profile: useMyProfile(true), isAdmin: useIsAdmin() }),
        { wrapper },
      );
      await waitFor(() => expect(result.current.profile.isSuccess).toBe(true));
      expect(result.current.isAdmin).toBe(expected);
    },
  );

  it("loads admin lists only for an admin", async () => {
    vi.mocked(actor.getMyProfile).mockResolvedValue(
      makeProfile({ status: Status.approved, role: Role.member }),
    );
    const { result } = renderHook(
      () => ({
        profile: useMyProfile(true),
        pending: usePendingRequests(),
        approved: useApprovedUsers(),
      }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.profile.isSuccess).toBe(true));
    expect(actor.listPendingRequests).not.toHaveBeenCalled();
    expect(actor.listApprovedUsers).not.toHaveBeenCalled();
  });

  it("loads pending and approved lists for a Department Admin", async () => {
    vi.mocked(actor.getMyProfile).mockResolvedValue(
      makeProfile({ status: Status.approved, role: Role.departmentAdmin }),
    );
    const pendingUser = makeProfile({
      principal: OTHER,
      status: Status.pending,
    });
    vi.mocked(actor.listPendingRequests).mockResolvedValue([pendingUser]);

    const { result } = renderHook(
      () => ({ pending: usePendingRequests(), approved: useApprovedUsers() }),
      { wrapper },
    );

    await waitFor(() =>
      expect(result.current.pending.data).toEqual([pendingUser]),
    );
    await waitFor(() => expect(result.current.approved.isSuccess).toBe(true));
    expect(actor.listApprovedUsers).toHaveBeenCalledTimes(1);
  });

  it("routes each admin mutation to the matching actor method", async () => {
    const updated = makeProfile({ principal: THIRD });
    for (const fn of [
      actor.approveUser,
      actor.denyUser,
      actor.suspendUser,
      actor.appointDepartmentAdmin,
      actor.removeDepartmentAdmin,
      actor.setDemoAccount,
    ]) {
      vi.mocked(fn).mockResolvedValue(updated);
    }

    const { result } = renderHook(
      () => ({
        approve: useApproveUser(),
        deny: useDenyUser(),
        suspend: useSuspendUser(),
        appoint: useAppointDepartmentAdmin(),
        remove: useRemoveDepartmentAdmin(),
        demo: useSetDemoAccount(),
      }),
      { wrapper },
    );

    await result.current.approve.mutateAsync(THIRD);
    await result.current.deny.mutateAsync(THIRD);
    await result.current.suspend.mutateAsync(THIRD);
    await result.current.appoint.mutateAsync(THIRD);
    await result.current.remove.mutateAsync(THIRD);
    await result.current.demo.mutateAsync({ user: THIRD, isDemo: true });

    expect(actor.approveUser).toHaveBeenCalledWith(THIRD);
    expect(actor.denyUser).toHaveBeenCalledWith(THIRD);
    expect(actor.suspendUser).toHaveBeenCalledWith(THIRD);
    expect(actor.appointDepartmentAdmin).toHaveBeenCalledWith(THIRD);
    expect(actor.removeDepartmentAdmin).toHaveBeenCalledWith(THIRD);
    expect(actor.setDemoAccount).toHaveBeenCalledWith(THIRD, true);
  });
});
