import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Messaging "messaging";
import Types "../types/messaging";

module {
  public type Profile = Types.Profile;

  func sameDepartment(a : Text, b : Text) : Bool {
    let left = Messaging.trimText(a).toLower();
    not left.isEmpty() and left == Messaging.trimText(b).toLower();
  };

  // Super Admin or Approved Department Admin only; returns the caller's resolved profile.
  func requireAdmin(profiles : Map.Map<Principal, Profile>, caller : Principal) : Profile {
    let me = Messaging.resolveProfile(profiles, caller) ?? Runtime.trap("Access denied: administrators only");
    if (me.status != #approved or me.role == #member) {
      Runtime.trap("Access denied: administrators only");
    };
    me;
  };

  func requireSuperAdmin(profiles : Map.Map<Principal, Profile>, caller : Principal) {
    if (not Messaging.isSuperAdmin(profiles, caller)) {
      Runtime.trap("Access denied: only the Super Admin can do this");
    };
  };

  func inScope(admin : Profile, target : Profile) : Bool {
    admin.role == #superAdmin or sameDepartment(admin.department, target.department);
  };

  func findTarget(profiles : Map.Map<Principal, Profile>, target : Principal) : Profile {
    profiles.get(target) ?? Runtime.trap("User not found");
  };

  // Common guard for approve / deny / suspend: caller is an in-scope admin, target is neither
  // the Super Admin nor the caller.
  func requireManageable(
    profiles : Map.Map<Principal, Profile>,
    caller : Principal,
    target : Principal,
  ) : (Profile, Profile) {
    let admin = requireAdmin(profiles, caller);
    if (Messaging.isSuperAdmin(profiles, target)) {
      Runtime.trap("The Super Admin cannot be modified");
    };
    if (target == caller) {
      Runtime.trap("You cannot act on your own account");
    };
    let user = findTarget(profiles, target);
    if (not inScope(admin, user)) {
      Runtime.trap("Access denied: user belongs to another department");
    };
    (admin, user);
  };

  // Super Admin or Approved Department Admin only. Department Admins see only their own department.
  public func listPendingRequests(
    profiles : Map.Map<Principal, Profile>,
    caller : Principal,
  ) : [Profile] {
    let admin = requireAdmin(profiles, caller);
    profiles.values()
      .filter(func p = p.status == #pending and inScope(admin, p))
      .toArray()
      .sort(func(a, b) = Nat.compare(a.registeredAt, b.registeredAt));
  };

  public func listApprovedUsers(
    profiles : Map.Map<Principal, Profile>,
    caller : Principal,
  ) : [Profile] {
    let admin = requireAdmin(profiles, caller);
    Messaging.approvedProfiles(profiles).filter(func p = inScope(admin, p));
  };

  // Super Admin or Approved Department Admin only. Department Admins see only their own department.
  public func listSuspendedUsers(
    profiles : Map.Map<Principal, Profile>,
    caller : Principal,
  ) : [Profile] {
    let admin = requireAdmin(profiles, caller);
    profiles.values()
      .filter(func p = p.status == #suspended and inScope(admin, p))
      .toArray()
      .sort(func(a, b) = Nat.compare(a.registeredAt, b.registeredAt));
  };

  // Valid only on Pending targets.
  public func approveUser(
    profiles : Map.Map<Principal, Profile>,
    caller : Principal,
    target : Principal,
  ) : Profile {
    let (_, user) = requireManageable(profiles, caller, target);
    if (user.status != #pending) {
      Runtime.trap("Only pending requests can be approved");
    };
    let updated : Profile = { user with status = #approved };
    profiles.add(target, updated);
    updated;
  };

  // Valid only on Pending targets.
  public func denyUser(
    profiles : Map.Map<Principal, Profile>,
    caller : Principal,
    target : Principal,
  ) : Profile {
    let (_, user) = requireManageable(profiles, caller, target);
    if (user.status != #pending) {
      Runtime.trap("Only pending requests can be denied");
    };
    let updated : Profile = { user with status = #denied };
    profiles.add(target, updated);
    updated;
  };

  // Valid only on Approved targets; never the Super Admin or the caller.
  public func suspendUser(
    profiles : Map.Map<Principal, Profile>,
    caller : Principal,
    target : Principal,
  ) : Profile {
    let (admin, user) = requireManageable(profiles, caller, target);
    if (user.status != #approved) {
      Runtime.trap("Only approved users can be suspended");
    };
    if (user.role == #departmentAdmin and admin.role != #superAdmin) {
      Runtime.trap("Only the Super Admin can suspend a Department Admin");
    };
    // A suspended user cannot keep Department Admin rights.
    let updated : Profile = { user with status = #suspended; role = #member };
    profiles.add(target, updated);
    updated;
  };

  // Valid only on Suspended targets; never the Super Admin or the caller.
  // Sets the status back to Approved and leaves the profile and messages intact.
  public func reinstateUser(
    profiles : Map.Map<Principal, Profile>,
    caller : Principal,
    target : Principal,
  ) : Profile {
    let (admin, user) = requireManageable(profiles, caller, target);
    if (user.status != #suspended) {
      Runtime.trap("Only suspended users can be reinstated");
    };
    if (user.role == #departmentAdmin and admin.role != #superAdmin) {
      Runtime.trap("Only the Super Admin can reinstate a Department Admin");
    };
    let updated : Profile = { user with status = #approved };
    profiles.add(target, updated);
    updated;
  };

  // Super Admin only; target must be Approved.
  public func appointDepartmentAdmin(
    profiles : Map.Map<Principal, Profile>,
    caller : Principal,
    target : Principal,
  ) : Profile {
    requireSuperAdmin(profiles, caller);
    if (Messaging.isSuperAdmin(profiles, target)) {
      Runtime.trap("The Super Admin cannot be modified");
    };
    let user = findTarget(profiles, target);
    if (user.status != #approved) {
      Runtime.trap("Only approved users can become Department Admins");
    };
    if (user.role != #member) {
      Runtime.trap("User is already a Department Admin");
    };
    if (Messaging.trimText(user.department).isEmpty()) {
      Runtime.trap("User has no department");
    };
    let updated : Profile = { user with role = #departmentAdmin };
    profiles.add(target, updated);
    updated;
  };

  // Super Admin only; sets the target's role back to Member.
  public func removeDepartmentAdmin(
    profiles : Map.Map<Principal, Profile>,
    caller : Principal,
    target : Principal,
  ) : Profile {
    requireSuperAdmin(profiles, caller);
    if (Messaging.isSuperAdmin(profiles, target)) {
      Runtime.trap("The Super Admin cannot be modified");
    };
    let user = findTarget(profiles, target);
    if (user.role != #departmentAdmin) {
      Runtime.trap("User is not a Department Admin");
    };
    let updated : Profile = { user with role = #member };
    profiles.add(target, updated);
    updated;
  };

  // Super Admin only.
  public func setDemoAccount(
    profiles : Map.Map<Principal, Profile>,
    caller : Principal,
    target : Principal,
    isDemo : Bool,
  ) : Profile {
    requireSuperAdmin(profiles, caller);
    if (Messaging.isSuperAdmin(profiles, target)) {
      Runtime.trap("The Super Admin cannot be modified");
    };
    let user = findTarget(profiles, target);
    let updated : Profile = { user with isDemo };
    profiles.add(target, updated);
    updated;
  };
};
