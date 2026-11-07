import { Role, Status } from "@/backend";
import type {
  DirectoryEntry,
  Message,
  Profile,
  backendInterface,
} from "@/backend";
import type { Principal } from "@icp-sdk/core/principal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { vi } from "vitest";

import App from "@/App";
import { AWAITING_APPROVAL_MESSAGE } from "@/components/StatusScreen";

/** A minimal typed principal stand-in: the app only uses toText / toString. */
export function fakePrincipal(text: string): Principal {
  return {
    toText: () => text,
    toString: () => text,
  } as unknown as Principal;
}

/**
 * A stand-in principal for the Super Admin. Under the first-sign-in model the
 * Super Admin is whichever principal registers first, so no principal literal
 * is meaningful here: the frontend resolves Super Admin status from the
 * profile's `role`/`status` alone, and this constant only gives the fixtures a
 * distinct principal to hang that role on.
 */
export const SUPER = fakePrincipal("sssss-ss-super");
export const ME = fakePrincipal("aaaaa-aa-me");
export const OTHER = fakePrincipal("bbbbb-bb-other");
export const THIRD = fakePrincipal("ccccc-cc-third");

export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    principal: ME,
    fullName: "Ada Lovelace",
    workEmail: "ada@finance.gov",
    department: "Finance",
    jobTitle: "Analyst",
    role: Role.member,
    status: Status.approved,
    isDemo: false,
    registeredAt: 1n,
    ...overrides,
  };
}

export function makeEntry(
  principal: Principal,
  displayName: string,
  isDemo = false,
): DirectoryEntry {
  return { principal, displayName, isDemo };
}

export function makeMessage(
  sender: Principal,
  recipient: Principal,
  content: string,
  timestamp: bigint,
): Message {
  return { sender, recipient, content, timestamp };
}

/**
 * A typed stand-in for the generated backend actor. Implementing
 * `backendInterface` makes the compiler reject a mock whose method names or
 * argument shapes drift from the generated bindings.
 */
export function makeActor(): backendInterface {
  return {
    _initialize_access_control: vi.fn(),
    _internet_identity_sign_in_finish: vi.fn(),
    _internet_identity_sign_in_start: vi.fn(),
    appointDepartmentAdmin: vi.fn(),
    approveUser: vi.fn(),
    assignCallerUserRole: vi.fn(),
    denyUser: vi.fn(),
    execute: vi.fn(),
    getApiDoc: vi.fn(),
    getCallerUserRole: vi.fn(),
    getDirectoryEntry: vi.fn(),
    getMyProfile: vi.fn().mockResolvedValue(null),
    getThread: vi.fn().mockResolvedValue([]),
    isCallerAdmin: vi.fn(),
    listApprovedUsers: vi.fn().mockResolvedValue([]),
    listDirectory: vi.fn().mockResolvedValue([]),
    listPendingRequests: vi.fn().mockResolvedValue([]),
    listSuspendedUsers: vi.fn().mockResolvedValue([]),
    registerProfile: vi.fn(),
    reinstateUser: vi.fn(),
    removeDepartmentAdmin: vi.fn(),
    schema: vi.fn(),
    sendMessage: vi.fn(),
    setDemoAccount: vi.fn(),
    suspendUser: vi.fn(),
  };
}

export function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
  return { ...utils, queryClient };
}

/**
 * Re-exported from the component so the fixture cannot drift from the string
 * the UI actually renders.
 */
export const AWAITING_MESSAGE = AWAITING_APPROVAL_MESSAGE;
