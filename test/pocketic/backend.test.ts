import { PocketIc, createIdentity } from "@dfinity/pic";
import type { Actor, CanisterFixture } from "@dfinity/pic";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { idlFactory } from "../../src/frontend/src/declarations/backend.did.js";
import type { _SERVICE } from "../../src/frontend/src/declarations/backend.did";

const PIC_URL = process.env.POCKET_IC_URL ?? "";
const BACKEND_WASM = process.env.BACKEND_WASM ?? "";
// Set only on a converted project: the last pre-EM revision, whose schema this
// app's migration chain replays from. Installing the current wasm onto an empty
// canister there traps IC0503 before any test runs.
const BASELINE_WASM = process.env.BACKEND_WASM_BASELINE;

// Deterministic callers. `createIdentity` is the only hand-free way to name a
// caller: the client re-exports no `Principal`, so a principal is always
// reached through an identity. Under the first-sign-in model the Super Admin is
// whichever principal registers first, so no hard-coded principal is needed.
const alice = createIdentity("alice");
const bob = createIdentity("bob");
const carol = createIdentity("carol");
const dave = createIdentity("dave");

let pic: PocketIc | undefined;
let actor: Actor<_SERVICE>;
let canisterId: CanisterFixture<_SERVICE>["canisterId"];

beforeAll(async () => {
  pic = await PocketIc.create(PIC_URL);
  if (BASELINE_WASM === undefined) {
    ({ actor, canisterId } = await pic.setupCanister<_SERVICE>({ idlFactory, wasm: BACKEND_WASM }));
    return;
  }
  // `[baseline, current]`, the same install contract the hosted deploy uses for
  // a converted project. The upgrade replays the chain from the legacy schema.
  const installed = await pic.setupCanister<_SERVICE>({ idlFactory, wasm: BASELINE_WASM });
  await pic.upgradeCanister({ canisterId: installed.canisterId, wasm: BACKEND_WASM, arg: new Uint8Array() });
  ({ actor, canisterId } = installed);
});

afterAll(async () => {
  // `?.` because `beforeAll` may not have got that far.
  await pic?.tearDown();
});

async function signUp(
  who: ReturnType<typeof createIdentity>,
  fullName: string,
  department = "Finance",
) {
  actor.setIdentity(who);
  return actor.registerProfile(fullName, `${fullName.toLowerCase().replace(/\s+/g, ".")}@gov.test`, department, "Analyst");
}

describe("first registrant becomes the Super Admin", () => {
  it("returns no profile for a caller who has not registered", async () => {
    actor.setIdentity(createIdentity("never-registered"));
    await expect(actor.getMyProfile()).resolves.toEqual([]);
  });

  it("stores the first registrant as an Approved Super Admin", async () => {
    const profile = await signUp(alice, "Alice Adams");
    expect(profile.fullName).toBe("Alice Adams");
    expect(profile.department).toBe("Finance");
    expect(profile.jobTitle).toBe("Analyst");
    expect(profile.workEmail).toBe("alice.adams@gov.test");
    expect(profile.status).toEqual({ approved: null });
    expect(profile.role).toEqual({ superAdmin: null });
    expect(profile.isDemo).toBe(false);

    actor.setIdentity(alice);
    const mine = await actor.getMyProfile();
    expect(mine).toHaveLength(1);
    expect(mine[0].status).toEqual({ approved: null });
    expect(mine[0].role).toEqual({ superAdmin: null });
  });

  it("stores every later registrant as a Pending Member", async () => {
    const profile = await signUp(bob, "Bob Brown");
    expect(profile.status).toEqual({ pending: null });
    expect(profile.role).toEqual({ member: null });
  });

  it("never grants Super Admin to a later registrant", async () => {
    await signUp(carol, "Carol Clark");
    const mine = await actor.getMyProfile();
    expect(mine[0].role).toEqual({ member: null });
    expect(mine[0].status).toEqual({ pending: null });
  });

  it("keeps a re-registering user's role and status unchanged", async () => {
    await signUp(bob, "Bob Brown");
    const again = await signUp(bob, "Bob B. Brown");
    expect(again.fullName).toBe("Bob B. Brown");
    expect(again.status).toEqual({ pending: null });
    expect(again.role).toEqual({ member: null });
  });

  it("rejects a blank required field from a signed-in caller", async () => {
    actor.setIdentity(dave);
    await expect(actor.registerProfile("Dave", "   ", "Finance", "Analyst")).rejects.toThrow();
    await expect(actor.registerProfile("Dave", "d@gov.test", "", "Analyst")).rejects.toThrow();
  });

  it("rejects an anonymous caller", async () => {
    // A freshly created actor calls as the anonymous principal until an identity
    // is set. `pic` is optional only so `afterAll` can tear down a partial setup.
    const guest = pic!.createActor<_SERVICE>(idlFactory, canisterId);
    await expect(guest.registerProfile("Anon", "a@gov.test", "Finance", "Analyst")).rejects.toThrow();
  });
});

describe("the Super Admin can approve a pending member", () => {
  it("approves a pending registrant, who then reaches the directory", async () => {
    const bobProfile = await signUp(bob, "Bob Brown");
    actor.setIdentity(alice);
    const approved = await actor.approveUser(bobProfile.principal);
    expect(approved.status).toEqual({ approved: null });

    actor.setIdentity(bob);
    const directory = await actor.listDirectory();
    expect(directory.map((entry) => entry.displayName)).toContain("Bob Brown");
  });

  it("lists the pending registrant for the Super Admin", async () => {
    await signUp(carol, "Carol Clark");
    actor.setIdentity(alice);
    const pending = await actor.listPendingRequests();
    expect(pending.map((p) => p.fullName)).toContain("Carol Clark");
  });
});

describe("non-Approved callers are rejected by the backend", () => {
  it("rejects listDirectory, getDirectoryEntry, sendMessage and getThread for a Pending user", async () => {
    const carolProfile = await signUp(carol, "Carol Pending");
    const daveProfile = await signUp(dave, "Dave Pending");
    actor.setIdentity(carol);

    await expect(actor.listDirectory()).rejects.toThrow();
    await expect(actor.getDirectoryEntry(daveProfile.principal)).rejects.toThrow();
    await expect(actor.sendMessage(daveProfile.principal, "hello")).rejects.toThrow();
    await expect(actor.getThread(daveProfile.principal)).rejects.toThrow();
    expect(carolProfile.status).toEqual({ pending: null });
  });

  it("rejects an unregistered caller on the gated methods", async () => {
    const stranger = createIdentity("stranger");
    const target = (await signUp(bob, "Bob Target")).principal;
    actor.setIdentity(stranger);
    await expect(actor.listDirectory()).rejects.toThrow();
    await expect(actor.sendMessage(target, "hi")).rejects.toThrow();
    await expect(actor.getThread(target)).rejects.toThrow();
  });

  it("rejects an anonymous caller on the gated methods", async () => {
    const guest = pic!.createActor<_SERVICE>(idlFactory, canisterId);
    await expect(guest.listDirectory()).rejects.toThrow();
  });
});

describe("admin methods reject callers who are not administrators", () => {
  it("rejects every admin call from a Pending Member", async () => {
    const target = (await signUp(bob, "Bob Target")).principal;
    await signUp(carol, "Carol Member");
    actor.setIdentity(carol);

    await expect(actor.listPendingRequests()).rejects.toThrow();
    await expect(actor.listApprovedUsers()).rejects.toThrow();
    await expect(actor.approveUser(target)).rejects.toThrow();
    await expect(actor.denyUser(target)).rejects.toThrow();
    await expect(actor.suspendUser(target)).rejects.toThrow();
  });

  it("rejects Super Admin-only calls from a non-Super-Admin", async () => {
    const target = (await signUp(bob, "Bob Target")).principal;
    await signUp(carol, "Carol Member");
    actor.setIdentity(carol);

    await expect(actor.appointDepartmentAdmin(target)).rejects.toThrow();
    await expect(actor.removeDepartmentAdmin(target)).rejects.toThrow();
    await expect(actor.setDemoAccount(target, true)).rejects.toThrow();
  });

  it("does not let a user approve themselves", async () => {
    const self = (await signUp(dave, "Dave Self")).principal;
    actor.setIdentity(dave);
    await expect(actor.approveUser(self)).rejects.toThrow();
    const mine = await actor.getMyProfile();
    expect(mine[0].status).toEqual({ pending: null });
  });

  it("rejects admin calls from an anonymous caller", async () => {
    const guest = pic!.createActor<_SERVICE>(idlFactory, canisterId);
    await expect(guest.listPendingRequests()).rejects.toThrow();
  });
});

describe("the backend stores and returns plain message text", () => {
  it("returns the exact text the sender submitted, to both participants", async () => {
    const { target, targetId } = await (async () => {
      const target = createIdentity("plaintext-peer");
      const targetProfile = await signUp(target, "Plain Peer");
      actor.setIdentity(alice);
      await actor.approveUser(targetProfile.principal);
      return { target, targetId: targetProfile.principal };
    })();

    // The sender submits plain text, as the browser now does.
    const content = "secret plan";
    actor.setIdentity(target);
    const sent = await actor.sendMessage(alice.getPrincipal(), content);
    expect(sent.content).toBe(content);

    // Both participants read back the same text.
    const senderThread = await actor.getThread(alice.getPrincipal());
    expect(senderThread.map((m) => m.content)).toContain(content);

    actor.setIdentity(alice);
    const recipientThread = await actor.getThread(targetId);
    expect(recipientThread.map((m) => m.content)).toContain(content);
  });

  it("does not expose one user's thread to an unrelated approved user", async () => {
    const { targetId } = await (async () => {
      const target = createIdentity("thread-peer");
      const targetProfile = await signUp(target, "Thread Peer");
      actor.setIdentity(alice);
      await actor.approveUser(targetProfile.principal);
      return { targetId: targetProfile.principal };
    })();

    const outsider = createIdentity("thread-outsider");
    const outsiderProfile = await signUp(outsider, "Thread Outsider");
    actor.setIdentity(alice);
    await actor.approveUser(outsiderProfile.principal);

    actor.setIdentity(outsider);
    const outsiderThread = await actor.getThread(targetId);
    expect(outsiderThread).toEqual([]);
  });
});

describe("suspending and reinstating a user preserves their profile and messages", () => {
  // Each test registers its own target so it does not depend on the order the
  // tests ran in: `registerProfile` keeps an existing user's status, so a
  // re-registered target would no longer be Pending and could not be approved.
  // The first registrant on the canister is already the Super Admin (`alice`).
  async function seedApprovedTarget(seed: string, fullName: string) {
    const target = createIdentity(seed);
    const targetProfile = await signUp(target, fullName);
    actor.setIdentity(alice);
    await actor.approveUser(targetProfile.principal);
    return { target, targetId: targetProfile.principal };
  }

  it("lists a suspended user and reinstates them back to Approved", async () => {
    const { targetId } = await seedApprovedTarget("preserve-target-a", "Tess Target");

    actor.setIdentity(alice);
    const suspended = await actor.suspendUser(targetId);
    expect(suspended.status).toEqual({ suspended: null });

    const suspendedList = await actor.listSuspendedUsers();
    expect(suspendedList.map((p) => p.principal.toText())).toContain(
      targetId.toText(),
    );

    const reinstated = await actor.reinstateUser(targetId);
    expect(reinstated.status).toEqual({ approved: null });
    expect(reinstated.principal.toText()).toBe(targetId.toText());

    const afterList = await actor.listSuspendedUsers();
    expect(afterList.map((p) => p.principal.toText())).not.toContain(
      targetId.toText(),
    );
  });

  it("keeps the profile identity fields and the message thread across suspend and reinstate", async () => {
    const { target, targetId } = await seedApprovedTarget(
      "preserve-target-b",
      "Tess Target",
    );

    // The target sends a message to the Super Admin before being suspended.
    // The backend stores and returns plain text in `content`.
    actor.setIdentity(target);
    await actor.sendMessage(alice.getPrincipal(), "before suspension");

    actor.setIdentity(alice);
    const suspended = await actor.suspendUser(targetId);
    expect(suspended).toMatchObject({
      fullName: "Tess Target",
      department: "Finance",
      jobTitle: "Analyst",
      status: { suspended: null },
    });

    // The thread survives suspension: the Super Admin still reads it, and the
    // stored value is the text the sender submitted.
    const threadWhileSuspended = await actor.getThread(targetId);
    expect(threadWhileSuspended.map((m) => m.content)).toContain(
      "before suspension",
    );

    const reinstated = await actor.reinstateUser(targetId);
    expect(reinstated).toMatchObject({
      fullName: "Tess Target",
      workEmail: "tess.target@gov.test",
      department: "Finance",
      jobTitle: "Analyst",
      status: { approved: null },
    });

    // The thread is still intact after reinstatement.
    const threadAfter = await actor.getThread(targetId);
    expect(threadAfter.map((m) => m.content)).toContain(
      "before suspension",
    );
  });

  it("rejects reinstating a user who is not suspended", async () => {
    const { targetId } = await seedApprovedTarget("preserve-target-c", "Tess Target");
    actor.setIdentity(alice);
    await expect(actor.reinstateUser(targetId)).rejects.toThrow();
  });
});
