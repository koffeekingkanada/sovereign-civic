import AccessControl "mo:caffeineai-authorization/access-control";
import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
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

  type InviteStatus = {
    #pending;
    #used;
    #expired;
    #cancelled;
  };

  type Invite = {
    id : Nat;
    fullName : Text;
    workEmail : Text;
    phone : Text;
    department : Text;
    role : Role;
    linkToken : Text;
    code : Text;
    status : InviteStatus;
    createdBy : Principal;
    createdAt : Nat;
    expiresAt : Nat;
    wrongCodeAttempts : Nat;
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
    invites : Map.Map<Nat, Invite>;
  };

  // Introduce invite state. Every existing profile, role, status and message is
  // preserved unchanged; no data is reset or deleted.
  public func migration(old : OldActor) : NewActor {
    {
      accessControlState = old.accessControlState;
      profiles = old.profiles;
      messages = old.messages;
      invites = Map.empty();
    };
  };
};
