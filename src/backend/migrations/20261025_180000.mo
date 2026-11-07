import AccessControl "mo:caffeineai-authorization/access-control";
import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  type OldProfile = {
    principal : Principal;
    displayName : Text;
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

  type NewProfile = {
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

  type OldActor = {
    accessControlState : AccessControl.AccessControlState;
    profiles : Map.Map<Principal, OldProfile>;
    messages : Map.Map<Principal, [Message]>;
  };

  type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    profiles : Map.Map<Principal, NewProfile>;
    messages : Map.Map<Principal, [Message]>;
  };

  public func migration(old : OldActor) : NewActor {
    let profiles = old.profiles.map<Principal, OldProfile, NewProfile>(
      func(_, p) {
        let isSuper = p.principal.toText() == "iedvi-n4vn4-pxnfm-wxovu-iawew-vneqs-snuvu-df5op-skbjl-l6y4d-sae";
        {
          principal = p.principal;
          fullName = p.displayName;
          workEmail = "";
          department = "";
          jobTitle = "";
          role = if (isSuper) { #superAdmin } else { #member };
          status = if (isSuper) { #approved } else { #pending };
          isDemo = false;
          registeredAt = p.registeredAt;
        };
      }
    );
    {
      accessControlState = old.accessControlState;
      profiles;
      messages = old.messages;
    };
  };
};
