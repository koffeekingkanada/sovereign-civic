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

  // Old message shape: plaintext `content`.
  type OldMessage = {
    sender : Principal;
    recipient : Principal;
    content : Text;
    timestamp : Nat;
  };

  // New message shape: end-to-end encrypted `ciphertext`.
  type NewMessage = {
    sender : Principal;
    recipient : Principal;
    ciphertext : Text;
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
    messages : Map.Map<Principal, [OldMessage]>;
  };

  type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    profiles : Map.Map<Principal, Profile>;
    messages : Map.Map<Principal, [NewMessage]>;
  };

  // End-to-end encryption rollout: delete every existing message (they were
  // stored as plaintext and cannot be re-encrypted without the participants'
  // keys). All users, roles and statuses are preserved unchanged.
  public func migration(old : OldActor) : NewActor {
    {
      accessControlState = old.accessControlState;
      profiles = old.profiles;
      messages = Map.empty();
    };
  };
};
