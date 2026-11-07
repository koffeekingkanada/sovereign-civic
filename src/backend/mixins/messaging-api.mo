import Int "mo:core/Int";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Types "../types/messaging";
import MessagingLib "../lib/messaging";

mixin (
  profiles : Map.Map<Principal, Types.Profile>,
  messages : Map.Map<Principal, [Types.Message]>,
) {
  // Time.now() is a signed Int; the stored Timestamp contract is Nat nanoseconds.
  // The clock is never negative, so a negative value is an unreachable guard.
  func nowNat() : Nat {
    let t = Time.now();
    if (t < 0) {
      Runtime.trap("System time is before the Unix epoch");
    };
    t.toNat();
  };
  public shared ({ caller }) func registerProfile(
    fullName : Text,
    workEmail : Text,
    department : Text,
    jobTitle : Text,
  ) : async Types.Profile {
    if (caller.isAnonymous()) {
      Runtime.trap("Anonymous callers cannot register");
    };
    MessagingLib.registerProfile(profiles, caller, fullName, workEmail, department, jobTitle, nowNat());
  };

  public query ({ caller }) func getMyProfile() : async ?Types.Profile {
    MessagingLib.getProfile(profiles, caller);
  };

  public query ({ caller }) func listDirectory() : async [Types.DirectoryEntry] {
    MessagingLib.listDirectory(profiles, caller);
  };

  public query ({ caller }) func getDirectoryEntry(user : Principal) : async ?Types.DirectoryEntry {
    MessagingLib.getDirectoryEntry(profiles, caller, user);
  };

  public shared ({ caller }) func sendMessage(recipient : Principal, content : Text) : async Types.Message {
    MessagingLib.sendMessage(profiles, messages, caller, recipient, content, nowNat());
  };

  public query ({ caller }) func getThread(other : Principal) : async [Types.Message] {
    MessagingLib.getThread(profiles, messages, caller, other);
  };
};
