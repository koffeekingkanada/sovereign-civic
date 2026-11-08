import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Result "mo:core/Result";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Types "../types/messaging";
import InvitesLib "../lib/invites";

mixin (
  profiles : Map.Map<Principal, Types.Profile>,
  invites : Map.Map<Nat, Types.Invite>,
) {
  // Time.now() is a signed Int; the stored Timestamp contract is Nat nanoseconds.
  // The clock is never negative, so a negative value is an unreachable guard.
  func inviteNow() : Nat {
    let t = Time.now();
    if (t < 0) {
      Runtime.trap("System time is before the Unix epoch");
    };
    t.toNat();
  };

  // The next unused invite id: one past the highest existing id, or 0 when empty.
  func nextInviteId() : Nat {
    var maxId = 0;
    var seen = false;
    for ((id, _) in invites.entries()) {
      if (not seen or id >= maxId) {
        maxId := id;
        seen := true;
      };
    };
    if (seen) { maxId + 1 } else { 0 };
  };

  public shared ({ caller }) func createInvite(
    fullName : Text,
    workEmail : Text,
    phone : Text,
    department : Text,
    role : Types.Role,
  ) : async Types.Invite {
    InvitesLib.createInvite(
      profiles,
      invites,
      nextInviteId(),
      caller,
      fullName,
      workEmail,
      phone,
      department,
      role,
      inviteNow(),
    );
  };

  public query ({ caller }) func listInvites() : async [Types.Invite] {
    InvitesLib.listInvites(profiles, invites, caller, inviteNow());
  };

  public shared ({ caller }) func cancelInvite(inviteId : Nat) : async Types.Invite {
    InvitesLib.cancelInvite(profiles, invites, caller, inviteId, inviteNow());
  };

  public shared ({ caller }) func redeemInvite(
    linkToken : Text,
    code : Text,
  ) : async Result.Result<Types.Profile, InvitesLib.RedeemError> {
    InvitesLib.redeemInvite(profiles, invites, caller, linkToken, code, inviteNow());
  };
};
