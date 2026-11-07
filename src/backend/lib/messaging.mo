import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Types "../types/messaging";

module {
  public type Profile = Types.Profile;
  public type DirectoryEntry = Types.DirectoryEntry;
  public type Message = Types.Message;

  // True when the stored profile for `who` holds the Super Admin role.
  public func isSuperAdmin(profiles : Map.Map<Principal, Profile>, who : Principal) : Bool {
    switch (profiles.get(who)) {
      case (?p) { p.role == #superAdmin };
      case null { false };
    };
  };

  public func trimText(value : Text) : Text {
    value.trim(#text " ");
  };

  public func roleText(role : Types.Role) : Text {
    switch (role) {
      case (#superAdmin) { "superAdmin" };
      case (#departmentAdmin) { "departmentAdmin" };
      case (#member) { "member" };
    };
  };

  public func statusText(status : Types.Status) : Text {
    switch (status) {
      case (#pending) { "pending" };
      case (#approved) { "approved" };
      case (#denied) { "denied" };
      case (#suspended) { "suspended" };
    };
  };

  // The stored profile for `who`, or null when unregistered.
  public func resolveProfile(
    profiles : Map.Map<Principal, Profile>,
    who : Principal,
  ) : ?Profile {
    profiles.get(who);
  };

  // Every Approved profile, oldest request first.
  public func approvedProfiles(profiles : Map.Map<Principal, Profile>) : [Profile] {
    profiles.values()
      .filter(func p = p.status == #approved)
      .toArray()
      .sort(func(a, b) = Nat.compare(a.registeredAt, b.registeredAt));
  };

  // Traps unless the caller resolves to an Approved profile; returns that profile.
  public func requireApproved(
    profiles : Map.Map<Principal, Profile>,
    caller : Principal,
  ) : Profile {
    let me = resolveProfile(profiles, caller)
      ?? Runtime.trap("Access denied: your access request has not been approved");
    if (me.status != #approved) {
      Runtime.trap("Access denied: your access request has not been approved");
    };
    me;
  };

  // Creates a Member/Pending profile, or updates the caller's own details only
  // (never role, status, isDemo, registeredAt).
  public func registerProfile(
    profiles : Map.Map<Principal, Profile>,
    caller : Principal,
    fullName : Text,
    workEmail : Text,
    department : Text,
    jobTitle : Text,
    now : Nat,
  ) : Profile {
    let name = trimText(fullName);
    let email = trimText(workEmail);
    let dept = trimText(department);
    let title = trimText(jobTitle);
    if (name.isEmpty() or email.isEmpty() or dept.isEmpty() or title.isEmpty()) {
      Runtime.trap("All profile fields are required");
    };
    switch (profiles.get(caller)) {
      case (?existing) {
        let updated : Profile = {
          existing with
          fullName = name;
          workEmail = email;
          department = dept;
          jobTitle = title;
        };
        profiles.add(caller, updated);
        updated;
      };
      case null {
        let isFirst = not profiles.values().any(func p = p.role == #superAdmin);
        let created : Profile = {
          principal = caller;
          fullName = name;
          workEmail = email;
          department = dept;
          jobTitle = title;
          role = if (isFirst) { #superAdmin } else { #member };
          status = if (isFirst) { #approved } else { #pending };
          isDemo = false;
          registeredAt = now;
        };
        profiles.add(caller, created);
        created;
      };
    };
  };

  public func getProfile(
    profiles : Map.Map<Principal, Profile>,
    caller : Principal,
  ) : ?Profile {
    profiles.get(caller);
  };

  // Traps unless caller is Approved; lists Approved users only.
  public func listDirectory(
    profiles : Map.Map<Principal, Profile>,
    caller : Principal,
  ) : [DirectoryEntry] {
    ignore requireApproved(profiles, caller);
    approvedProfiles(profiles).map(
      func p = { principal = p.principal; displayName = p.fullName; isDemo = p.isDemo }
    );
  };

  // Traps unless caller is Approved; null when user is not an Approved user.
  public func getDirectoryEntry(
    profiles : Map.Map<Principal, Profile>,
    caller : Principal,
    user : Principal,
  ) : ?DirectoryEntry {
    ignore requireApproved(profiles, caller);
    switch (profiles.get(user)) {
      case (?p) {
        if (p.status == #approved) {
          ?{ principal = p.principal; displayName = p.fullName; isDemo = p.isDemo };
        } else {
          null;
        };
      };
      case null { null };
    };
  };

  // Traps unless both sender and recipient are Approved. Stores the message text
  // in both participants' threads.
  public func sendMessage(
    profiles : Map.Map<Principal, Profile>,
    messages : Map.Map<Principal, [Message]>,
    sender : Principal,
    recipient : Principal,
    content : Text,
    now : Nat,
  ) : Message {
    ignore requireApproved(profiles, sender);
    if (sender == recipient) {
      Runtime.trap("Cannot send a message to yourself");
    };
    let recipientProfile = resolveProfile(profiles, recipient)
      ?? Runtime.trap("Recipient is not an approved user");
    if (recipientProfile.status != #approved) {
      Runtime.trap("Recipient is not an approved user");
    };
    let body = trimText(content);
    if (body.isEmpty()) {
      Runtime.trap("Message cannot be empty");
    };
    let message : Message = {
      sender;
      recipient;
      content = body;
      timestamp = now;
    };
    let senderThread = messages.get(sender) ?? [];
    messages.add(sender, senderThread.concat([message]));
    let recipientThread = messages.get(recipient) ?? [];
    messages.add(recipient, recipientThread.concat([message]));
    message;
  };

  // Traps unless caller is Approved.
  public func getThread(
    profiles : Map.Map<Principal, Profile>,
    messages : Map.Map<Principal, [Message]>,
    caller : Principal,
    other : Principal,
  ) : [Message] {
    ignore requireApproved(profiles, caller);
    let thread = messages.get(caller) ?? [];
    thread.filter(
      func m = (m.sender == caller and m.recipient == other) or (m.sender == other and m.recipient == caller)
    );
  };
};
