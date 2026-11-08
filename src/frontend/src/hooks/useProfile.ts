import { createActor } from "@/backend";
import { Status } from "@/backend";
import type { DirectoryEntry, Message, Profile, Result } from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const profileKeys = {
  me: ["profile", "me"] as const,
  directory: ["directory"] as const,
  thread: (other: string) => ["thread", other] as const,
};

/** The signed-in user's own profile, or null when not yet registered. */
export function useMyProfile(enabled: boolean) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Profile | null>({
    queryKey: profileKeys.me,
    queryFn: async () => {
      if (!actor) return null;
      return actor.getMyProfile();
    },
    enabled: enabled && !!actor && !isFetching,
  });
}

export interface ProfileInput {
  fullName: string;
  workEmail: string;
  department: string;
  jobTitle: string;
}

function useSaveProfile() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProfileInput) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.registerProfile(
        input.fullName,
        input.workEmail,
        input.department,
        input.jobTitle,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileKeys.me });
      void queryClient.invalidateQueries({ queryKey: profileKeys.directory });
    },
  });
}

/** Submit a sign-up request for the signed-in user. */
export function useRegisterProfile() {
  return useSaveProfile();
}

/** Update the signed-in user's own details. */
export function useUpdateProfile() {
  return useSaveProfile();
}

/** True only when the signed-in caller's profile is Approved. */
export function useIsApproved(): boolean {
  const me = useMyProfile(true);
  return me.data?.status === Status.approved;
}

/** All registered users available to message. */
export function useDirectory(enabled: boolean) {
  const { actor, isFetching } = useActor(createActor);
  const approved = useIsApproved();
  return useQuery<DirectoryEntry[]>({
    queryKey: profileKeys.directory,
    queryFn: async () => {
      if (!actor) return [];
      return actor.listDirectory();
    },
    enabled: enabled && approved && !!actor && !isFetching,
  });
}

/** The full message thread between the signed-in user and another principal. */
export function useThread(other: Principal | null, enabled: boolean) {
  const { actor, isFetching } = useActor(createActor);
  const approved = useIsApproved();
  const otherKey = other ? other.toText() : "none";
  return useQuery<Message[]>({
    queryKey: profileKeys.thread(otherKey),
    queryFn: async () => {
      if (!actor || !other) return [];
      return actor.getThread(other);
    },
    enabled: enabled && approved && !!actor && !isFetching && !!other,
    refetchInterval: 5000,
  });
}

/** Send a message to another registered principal. */
export function useSendMessage(other: Principal | null) {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  const otherKey = other ? other.toText() : "none";
  return useMutation({
    mutationFn: async (content: string) => {
      if (!actor) throw new Error("Backend is not ready");
      if (!other) throw new Error("No recipient selected");
      return actor.sendMessage(other, content);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: profileKeys.thread(otherKey),
      });
    },
  });
}

export interface RedeemInviteInput {
  linkToken: string;
  code: string;
}

/**
 * Redeem an invite from its link token and 6-digit code. The backend returns a
 * Result value: a matching pair creates and approves the caller's account, and
 * every failure (wrong code, expired, cancelled, used, not found) is returned
 * as a value rather than thrown.
 */
export function useRedeemInvite() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation<Result, Error, RedeemInviteInput>({
    mutationFn: async ({ linkToken, code }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.redeemInvite(linkToken, code);
    },
    onSuccess: (result) => {
      if (result.__kind__ === "ok") {
        void queryClient.invalidateQueries({ queryKey: profileKeys.me });
        void queryClient.invalidateQueries({
          queryKey: profileKeys.directory,
        });
      }
    },
  });
}
