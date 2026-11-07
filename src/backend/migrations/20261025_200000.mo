import AccessControl "mo:caffeineai-authorization/access-control";
import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  type Profile = {
    principal : Principal;
    fullName : Text;
    workEmail : Text;
    department : Text;
    jobTitle : Text;
    role : Role;
    status : Status;
    isDemo : Bool;
    registeredAt : Nat;
  };

  type Message = {
    sender : Principal;
    recipient : Principal;
    content : Text;
    timestamp : Nat;
  };

  type Role = {
    #superAdmin;
    #departmentAdmin;
    #member;
  };

  type Status = {
    #pending;
    #approved;
    #denied;
    #suspended;
  };

  type OldActor = {
    accessControlState : AccessControl.AccessControlState;
    profiles : Map.Map<Principal, Profile>;
    messages : Map.Map<Principal, [Message]>;
  };

  type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    profiles : Map.Map<Principal, Profile>;
    messages : Map.Map<Principal, [Message]>;
  };

  // Reset: wipe every stored profile and every stored message so the app starts
  // from an empty user base with no pre-existing Super Admin. The first person to
  // register afterwards claims Super Admin.
  public func migration(old : OldActor) : NewActor {
    {
      accessControlState = old.accessControlState;
      profiles = Map.empty();
      messages = Map.empty();
    };
  };
};
