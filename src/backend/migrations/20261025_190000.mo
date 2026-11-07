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

  let newSuperAdminText = "d56bj-ppeys-opdyx-h7ee7-soqz5-5uacj-ptvcl-m7pyg-nvfey-gs4ow-tae";
  let oldSuperAdminText = "iedvi-n4vn4-pxnfm-wxovu-iawew-vneqs-snuvu-df5op-skbjl-l6y4d-sae";

  public func migration(old : OldActor) : NewActor {
    let profiles = old.profiles.map<Principal, Profile, Profile>(
      func(_, p) {
        let text = p.principal.toText();
        if (text == newSuperAdminText) {
          { p with role = #superAdmin; status = #approved };
        } else if (text == oldSuperAdminText) {
          { p with role = #member; status = #pending };
        } else {
          p;
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
