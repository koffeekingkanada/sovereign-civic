import Principal "mo:core/Principal";
import Common "../types/common";

module {
  public type UserId = Principal;

  public type Role = {
    #superAdmin;
    #departmentAdmin;
    #member;
  };

  public type Status = {
    #pending;
    #approved;
    #denied;
    #suspended;
  };

  // fullName is the former displayName. registeredAt is also the access request date.
  public type Profile = {
    principal : UserId;
    fullName : Text;
    workEmail : Text;
    department : Text;
    jobTitle : Text;
    role : Role;
    status : Status;
    isDemo : Bool;
    registeredAt : Common.Timestamp;
  };

  // Directory entry: only Approved users are listed. displayName carries the full name.
  public type DirectoryEntry = {
    principal : UserId;
    displayName : Text;
    isDemo : Bool;
  };

  // The backend stores the message text in `content` and returns it only to the
  // two participants of the conversation.
  public type Message = {
    sender : UserId;
    recipient : UserId;
    content : Text;
    timestamp : Common.Timestamp;
  };
};
