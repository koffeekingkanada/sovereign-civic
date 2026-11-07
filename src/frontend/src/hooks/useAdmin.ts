import { Role, Status, createActor } from "@/backend";
import type { Profile, backendInterface } from "@/backend";
import { profileKeys, useMyProfile } from "@/hooks/useProfile";
import { useActor } from "@caffeineai/core-infrastructure";
import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const adminKeys = {
  pending: ["admin", "pending"] as const,
  approved: ["admin", "approved"] as const,
  suspended: ["admin", "suspended"] as const,
};

/** True when the caller is an Approved Super Admin or Department Admin. */
export function useIsAdmin(): boolean {
  const me = useMyProfile(true);
  const profile = me.data;
  return (
    !!profile &&
    profile.status === Status.approved &&
    (profile.role === Role.superAdmin || profile.role === Role.departmentAdmin)
  );
}

/** Sign-up requests awaiting a decision. */
export function usePendingRequests() {
  const { actor, isFetching } = useActor(createActor);
  const isAdmin = useIsAdmin();
  return useQuery<Profile[]>({
    queryKey: adminKeys.pending,
    queryFn: async () => {
      if (!actor) return [];
      return actor.listPendingRequests();
    },
    enabled: isAdmin && !!actor && !isFetching,
  });
}

/** Users the caller is permitted to see in the approved list. */
export function useApprovedUsers() {
  const { actor, isFetching } = useActor(createActor);
  const isAdmin = useIsAdmin();
  return useQuery<Profile[]>({
    queryKey: adminKeys.approved,
    queryFn: async () => {
      if (!actor) return [];
      return actor.listApprovedUsers();
    },
    enabled: isAdmin && !!actor && !isFetching,
  });
}

/** Users whose access has been suspended and can be reinstated. */
export function useSuspendedUsers() {
  const { actor, isFetching } = useActor(createActor);
  const isAdmin = useIsAdmin();
  return useQuery<Profile[]>({
    queryKey: adminKeys.suspended,
    queryFn: async () => {
      if (!actor) return [];
      return actor.listSuspendedUsers();
    },
    enabled: isAdmin && !!actor && !isFetching,
  });
}

function useAdminMutation<V>(
  run: (actor: backendInterface, variables: V) => Promise<Profile>,
) {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: V) => {
      if (!actor) throw new Error("Backend is not ready");
      return run(actor, variables);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.pending });
      void queryClient.invalidateQueries({ queryKey: adminKeys.approved });
      void queryClient.invalidateQueries({ queryKey: adminKeys.suspended });
      void queryClient.invalidateQueries({ queryKey: profileKeys.directory });
    },
  });
}

export function useApproveUser() {
  return useAdminMutation<Principal>((actor, user) => actor.approveUser(user));
}

export function useDenyUser() {
  return useAdminMutation<Principal>((actor, user) => actor.denyUser(user));
}

export function useSuspendUser() {
  return useAdminMutation<Principal>((actor, user) => actor.suspendUser(user));
}

export function useReinstateUser() {
  return useAdminMutation<Principal>((actor, user) =>
    actor.reinstateUser(user),
  );
}

export function useAppointDepartmentAdmin() {
  return useAdminMutation<Principal>((actor, user) =>
    actor.appointDepartmentAdmin(user),
  );
}

export function useRemoveDepartmentAdmin() {
  return useAdminMutation<Principal>((actor, user) =>
    actor.removeDepartmentAdmin(user),
  );
}

export function useSetDemoAccount() {
  return useAdminMutation<{ user: Principal; isDemo: boolean }>(
    (actor, { user, isDemo }) => actor.setDemoAccount(user, isDemo),
  );
}
