import Map "mo:core/Map";
import Principal "mo:core/Principal";
import AccessLib "../lib/access";
import Types "../types/messaging";

mixin (profiles : Map.Map<Principal, Types.Profile>) {
  public query ({ caller }) func listPendingRequests() : async [Types.Profile] {
    AccessLib.listPendingRequests(profiles, caller);
  };

  public query ({ caller }) func listApprovedUsers() : async [Types.Profile] {
    AccessLib.listApprovedUsers(profiles, caller);
  };

  public query ({ caller }) func listSuspendedUsers() : async [Types.Profile] {
    AccessLib.listSuspendedUsers(profiles, caller);
  };

  public shared ({ caller }) func approveUser(user : Principal) : async Types.Profile {
    AccessLib.approveUser(profiles, caller, user);
  };

  public shared ({ caller }) func denyUser(user : Principal) : async Types.Profile {
    AccessLib.denyUser(profiles, caller, user);
  };

  public shared ({ caller }) func suspendUser(user : Principal) : async Types.Profile {
    AccessLib.suspendUser(profiles, caller, user);
  };

  public shared ({ caller }) func reinstateUser(user : Principal) : async Types.Profile {
    AccessLib.reinstateUser(profiles, caller, user);
  };

  public shared ({ caller }) func appointDepartmentAdmin(user : Principal) : async Types.Profile {
    AccessLib.appointDepartmentAdmin(profiles, caller, user);
  };

  public shared ({ caller }) func removeDepartmentAdmin(user : Principal) : async Types.Profile {
    AccessLib.removeDepartmentAdmin(profiles, caller, user);
  };

  public shared ({ caller }) func setDemoAccount(user : Principal, isDemo : Bool) : async Types.Profile {
    AccessLib.setDemoAccount(profiles, caller, user, isDemo);
  };
};
