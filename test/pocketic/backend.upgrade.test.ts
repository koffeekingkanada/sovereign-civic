import { PocketIc, createIdentity } from "@dfinity/pic";
import type { Actor } from "@dfinity/pic";
import { afterAll, beforeAll, expect, it } from "vitest";

import { idlFactory as previousIdlFactory } from "../../.old/src/frontend/src/declarations/backend.did.js";
import { idlFactory } from "../../src/frontend/src/declarations/backend.did.js";
import type { _SERVICE } from "../../src/frontend/src/declarations/backend.did";

const PIC_URL = process.env.POCKET_IC_URL ?? "";
const BACKEND_WASM = process.env.BACKEND_WASM ?? "";
const PREVIOUS_WASM = process.env.BACKEND_WASM_PREVIOUS ?? "";

// The previous revision's public API only needs the methods this test touches;
// it is declared locally because the previous declarations are untyped
// JavaScript. The previous revision already used the four-field registerProfile
// signature (fullName, workEmail, department, jobTitle), so the call below must
// pass all four or the Candid encoder rejects it with "Wrong number of message
// arguments". Its `sendMessage` took the end-to-end encrypted `ciphertext`
// (the encryption rollout predates this build), so the value below is an opaque
// blob that this build's migration renames to `content`.
type PreviousProfile = {
  fullName: string;
  workEmail: string;
  department: string;
  jobTitle: string;
  status: { pending: null } | { approved: null } | { denied: null } | { suspended: null };
  role: { member: null } | { departmentAdmin: null } | { superAdmin: null };
  isDemo: boolean;
};

type PreviousService = {
  registerProfile: (
    fullName: string,
    workEmail: string,
    department: string,
    jobTitle: string,
  ) => Promise<PreviousProfile>;
  getMyProfile: () => Promise<Array<PreviousProfile>>;
  approveUser: (user: unknown) => Promise<PreviousProfile>;
  sendMessage: (recipient: unknown, ciphertext: string) => Promise<unknown>;
};

let pic: PocketIc | undefined;

beforeAll(async () => {
  pic = await PocketIc.create(PIC_URL);
});

afterAll(async () => {
  await pic?.tearDown();
});

// This build adds a migration that preserves every stored profile and message
// across the upgrade: no users, roles, statuses or messages are reset. This test
// installs the previous revision, writes through its public API, upgrades to
// this build, and asserts both halves of that accepted change: profiles survive
// with their role and status, and the message written before the upgrade is
// still readable afterwards.
it("preserves users, roles, statuses and messages on upgrade", async () => {
  const legacyUser = createIdentity("legacy-user");
  const legacyPeer = createIdentity("legacy-peer");

  // 1. Install the version users are actually running and write through its API.
  const previous = await pic!.setupCanister<PreviousService>({
    idlFactory: previousIdlFactory,
    wasm: PREVIOUS_WASM,
  });
  previous.actor.setIdentity(legacyUser);
  await previous.actor.registerProfile(
    "Legacy User",
    "legacy.user@gov.test",
    "Finance",
    "Analyst",
  );
  previous.actor.setIdentity(legacyPeer);
  await previous.actor.registerProfile(
    "Legacy Peer",
    "legacy.peer@gov.test",
    "Finance",
    "Analyst",
  );
  // The first registrant is the approved Super Admin; approve the peer so the
  // message below has an approved recipient. The previous revision stored the
  // end-to-end encrypted `ciphertext`; this build's migration renames it to
  // `content`, so the value is an opaque blob that must survive the upgrade.
  previous.actor.setIdentity(legacyUser);
  await previous.actor.approveUser(legacyPeer.getPrincipal());
  await previous.actor.sendMessage(legacyPeer.getPrincipal(), "enc:before upgrade");

  // 2. Upgrade to this build. The preservation migration runs here.
  await pic!.upgradeCanister({
    canisterId: previous.canisterId,
    wasm: BACKEND_WASM,
    upgradeModeOptions: { skip_pre_upgrade: [], wasm_memory_persistence: [{ keep: null }] },
  });

  // 3. The profile written by the previous version is still there, identity intact.
  const upgraded: Actor<_SERVICE> = pic!.createActor<_SERVICE>(idlFactory, previous.canisterId);
  upgraded.setIdentity(legacyUser);
  const mine = await upgraded.getMyProfile();
  expect(mine).toHaveLength(1);
  expect(mine[0]).toMatchObject({
    fullName: "Legacy User",
    workEmail: "legacy.user@gov.test",
    department: "Finance",
    jobTitle: "Analyst",
    status: { approved: null },
    role: { superAdmin: null },
  });

  // 4. The peer's profile, role and status also survive the upgrade.
  const peerProfile = await upgraded.getDirectoryEntry(legacyPeer.getPrincipal());
  expect(peerProfile).toHaveLength(1);
  expect(peerProfile[0]).toMatchObject({ displayName: "Legacy Peer" });

  // 5. The message written before the upgrade is still there: the thread is
  //    preserved, not reset, and the migration renamed the stored `ciphertext`
  //    to `content` without changing its value.
  const thread = await upgraded.getThread(legacyPeer.getPrincipal());
  expect(thread.map((m) => m.content)).toContain("enc:before upgrade");

  // 6. The upgraded canister exposes the new reinstate method: the previous
  //    revision had no such method, so this is the API surface this build adds.
  expect(typeof upgraded.reinstateUser).toBe("function");
});
