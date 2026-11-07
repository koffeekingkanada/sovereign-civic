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

  // Old message shape: end-to-end encrypted `ciphertext`.
  type OldMessage = {
    sender : Principal;
    recipient : Principal;
    ciphertext : Text;
    timestamp : Nat;
  };

  // New message shape: plain text `content`.
  type NewMessage = {
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
    messages : Map.Map<Principal, [OldMessage]>;
  };

  type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    profiles : Map.Map<Principal, Profile>;
    messages : Map.Map<Principal, [NewMessage]>;
  };

  // Rename the stored message field from `ciphertext` to `content`. Every
  // existing message, profile, role and status is preserved unchanged; no data
  // is reset or deleted.
  public func migration(old : OldActor) : NewActor {
    let messages = old.messages.map<Principal, [OldMessage], [NewMessage]>(
      func(_who, thread) {
        thread.map(
          func(m) {
            {
              sender = m.sender;
              recipient = m.recipient;
              content = m.ciphertext;
              timestamp = m.timestamp;
            };
          }
        );
      }
    );
    {
      accessControlState = old.accessControlState;
      profiles = old.profiles;
      messages;
    };
  };
};
