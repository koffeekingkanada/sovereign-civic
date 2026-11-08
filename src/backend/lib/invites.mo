import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Runtime "mo:core/Runtime";
import Types "../types/messaging";
import Messaging "messaging";

module {
  public type Invite = Types.Invite;
  public type InviteStatus = Types.InviteStatus;
  public type Profile = Types.Profile;
  public type Role = Types.Role;

  // 7 days in nanoseconds (7 * 24 * 60 * 60 * 1_000_000_000).
  public let INVITE_TTL_NS : Nat = 604_800_000_000_000;
  // An invite is cancelled after this many wrong code attempts.
  public let MAX_WRONG_ATTEMPTS : Nat = 5;

  // Caller-visible outcome of a redemption attempt. Failures are values, not
  // traps, so a wrong-code attempt is committed before the caller is told.
  public type RedeemError = {
    #notFound;
    #used;
    #expired;
    #cancelled;
    #wrongCode : { remaining : Nat };
    #tooManyAttempts;
  };

  // Deterministic, collision-resistant token derived from the invite id and the
  // creation time. Not a secret; the 6-digit code is the second factor.
  func makeLinkToken(id : Nat, now : Nat) : Text {
    "inv-" # id.toText() # "-" # now.toText();
  };

  // A 6-digit code derived from the invite id and creation time. Always exactly
  // six digits, zero-padded.
  func makeCode(id : Nat, now : Nat) : Text {
    let raw = (id * 7919 + now / 1_000_000_000) % 1_000_000;
    let digits = raw.toText();
    var prefix = "";
    var i = digits.size();
    while (i < 6) {
      prefix := prefix # "0";
      i += 1;
    };
    prefix # digits;
  };

  func sameDepartment(a : Text, b : Text) : Bool {
    let left = Messaging.trimText(a).toLower();
    not left.isEmpty() and left == Messaging.trimText(b).toLower();
  };

  // Super Admin or Approved Department Admin only; returns the caller's profile.
  func requireAdmin(profiles : Map.Map<Principal, Profile>, caller : Principal) : Profile {
    let me = Messaging.resolveProfile(profiles, caller)
      ?? Runtime.trap("Access denied: administrators only");
    if (me.status != #approved or me.role == #member) {
      Runtime.trap("Access denied: administrators only");
    };
    me;
  };

  // The effective status of an invite, accounting for expiry. A pending invite
  // whose expiry has passed is reported (and persisted) as expired.
  func effectiveStatus(invite : Invite, now : Nat) : InviteStatus {
    switch (invite.status) {
      case (#pending) {
        if (now >= invite.expiresAt) { #expired } else { #pending };
      };
      case (other) { other };
    };
  };

  // Creates a single-use invite. Department Admins may only invite into their own
  // department; the Super Admin may invite into any department.
  public func createInvite(
    profiles : Map.Map<Principal, Profile>,
    invites : Map.Map<Nat, Invite>,
    nextId : Nat,
    caller : Principal,
    fullName : Text,
    workEmail : Text,
    phone : Text,
    department : Text,
    role : Role,
    now : Nat,
  ) : Invite {
    let admin = requireAdmin(profiles, caller);
    let name = Messaging.trimText(fullName);
    let email = Messaging.trimText(workEmail);
    let phoneNumber = Messaging.trimText(phone);
    let dept = Messaging.trimText(department);
    if (name.isEmpty() or email.isEmpty() or phoneNumber.isEmpty() or dept.isEmpty()) {
      Runtime.trap("All invite fields are required");
    };
    if (admin.role != #superAdmin and not sameDepartment(admin.department, dept)) {
      Runtime.trap("Access denied: you can only invite into your own department");
    };
    if (role == #superAdmin and admin.role != #superAdmin) {
      Runtime.trap("Access denied: only the Super Admin can grant the Super Admin role");
    };
    let invite : Invite = {
      id = nextId;
      fullName = name;
      workEmail = email;
      phone = phoneNumber;
      department = dept;
      role;
      linkToken = makeLinkToken(nextId, now);
      code = makeCode(nextId, now);
      status = #pending;
      createdBy = caller;
      createdAt = now;
      expiresAt = now + INVITE_TTL_NS;
      wrongCodeAttempts = 0;
    };
    invites.add(nextId, invite);
    invite;
  };

  // Lists invites visible to the caller: the Super Admin sees all, a Department
  // Admin sees only invites for their own department. Expired pending invites are
  // reported as expired. Newest first.
  public func listInvites(
    profiles : Map.Map<Principal, Profile>,
    invites : Map.Map<Nat, Invite>,
    caller : Principal,
    now : Nat,
  ) : [Invite] {
    let admin = requireAdmin(profiles, caller);
    invites.values()
      .filter(func inv = admin.role == #superAdmin or sameDepartment(admin.department, inv.department))
      .map(func inv = { inv with status = effectiveStatus(inv, now) })
      .toArray()
      .sort(func(a, b) = Nat.compare(b.createdAt, a.createdAt));
  };

  // Cancels a pending invite. Only an admin in scope may cancel it.
  public func cancelInvite(
    profiles : Map.Map<Principal, Profile>,
    invites : Map.Map<Nat, Invite>,
    caller : Principal,
    inviteId : Nat,
    now : Nat,
  ) : Invite {
    let admin = requireAdmin(profiles, caller);
    let invite = invites.get(inviteId) ?? Runtime.trap("Invite not found");
    if (admin.role != #superAdmin and not sameDepartment(admin.department, invite.department)) {
      Runtime.trap("Access denied: invite belongs to another department");
    };
    switch (effectiveStatus(invite, now)) {
      case (#pending) {};
      case (#used) { Runtime.trap("Invite has already been used") };
      case (#expired) { Runtime.trap("Invite has expired") };
      case (#cancelled) { Runtime.trap("Invite is already cancelled") };
    };
    let updated : Invite = { invite with status = #cancelled };
    invites.add(inviteId, updated);
    updated;
  };

  // Redeems an invite from its link token plus the 6-digit code. On success the
  // caller's account is created and approved with the invite's department and
  // role, and the invite is marked used. A wrong code increments the attempt
  // counter and cancels the invite after MAX_WRONG_ATTEMPTS. Failures are
  // returned as values so the recorded attempt is committed.
  public func redeemInvite(
    profiles : Map.Map<Principal, Profile>,
    invites : Map.Map<Nat, Invite>,
    caller : Principal,
    linkToken : Text,
    code : Text,
    now : Nat,
  ) : Result.Result<Profile, RedeemError> {
    if (caller.isAnonymous()) {
      Runtime.trap("Anonymous callers cannot redeem an invite");
    };
    let token = Messaging.trimText(linkToken);
    let entered = Messaging.trimText(code);
    let invite = switch (invites.values().find(func inv = inv.linkToken == token)) {
      case (?found) { found };
      case null { return #err(#notFound) };
    };
    switch (effectiveStatus(invite, now)) {
      case (#pending) {};
      case (#used) { return #err(#used) };
      case (#expired) { return #err(#expired) };
      case (#cancelled) { return #err(#cancelled) };
    };
    if (entered != invite.code) {
      let attempts = invite.wrongCodeAttempts + 1;
      if (attempts >= MAX_WRONG_ATTEMPTS) {
        invites.add(invite.id, { invite with wrongCodeAttempts = attempts; status = #cancelled });
        return #err(#tooManyAttempts);
      };
      invites.add(invite.id, { invite with wrongCodeAttempts = attempts });
      return #err(#wrongCode({ remaining = MAX_WRONG_ATTEMPTS - attempts }));
    };
    let profile : Profile = {
      principal = caller;
      fullName = invite.fullName;
      workEmail = invite.workEmail;
      department = invite.department;
      jobTitle = "";
      role = invite.role;
      status = #approved;
      isDemo = false;
      registeredAt = now;
    };
    profiles.add(caller, profile);
    invites.add(invite.id, { invite with status = #used });
    #ok(profile);
  };
};
