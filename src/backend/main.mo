import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import OQL "mo:caffeineai-oql";
import Expose "mo:caffeineai-oql/Expose";
import Entity "mo:caffeineai-oql/Entity";
import NatValue "mo:caffeineai-oql/NatValue";
import BoolValue "mo:caffeineai-oql/BoolValue";
import TextValue "mo:caffeineai-oql/TextValue";
import PrincipalValue "mo:caffeineai-oql/PrincipalValue";
import Iter "mo:core/Iter";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Types "types/messaging";
import MessagingLib "lib/messaging";
import MessagingApi "mixins/messaging-api";
import AccessApi "mixins/access-api";
import InvitesApi "mixins/invites-api";
import ApiDocMixin "mixins/api-doc";

actor {
  let accessControlState : AccessControl.AccessControlState;
  let profiles : Map.Map<Principal, Types.Profile>;
  let messages : Map.Map<Principal, [Types.Message]>;
  let invites : Map.Map<Nat, Types.Invite>;

  transient let anyPrincipal = Principal.fromText("aaaaa-aa");

  // Flatten the per-participant message threads into one row per message.
  func messageRows() : Iter.Iter<Types.Message> {
    messages.values().flatMap(
      func(thread) = thread.values()
    );
  };

  func profileRows() : Iter.Iter<Types.Profile> {
    profiles.values();
  };

  func inviteRows() : Iter.Iter<Types.Invite> {
    invites.values();
  };

  func inviteStatusText(status : Types.InviteStatus) : Text {
    switch (status) {
      case (#pending) { "pending" };
      case (#used) { "used" };
      case (#expired) { "expired" };
      case (#cancelled) { "cancelled" };
    };
  };

  include MixinAuthorization(accessControlState, null);
  include MessagingApi(profiles, messages);
  include AccessApi(profiles);
  include InvitesApi(profiles, invites);
  include ApiDocMixin();
  include Expose({
    entities = [
      OQL.Entity.manual<Types.Profile>("profile", profileRows, "Profile", "principal")
        .sample({
          principal = anyPrincipal;
          fullName = "";
          workEmail = "";
          department = "";
          jobTitle = "";
          role = #member;
          status = #pending;
          isDemo = false;
          registeredAt = 0;
        })
        .payload("principal", func(p) = p.principal)
        .payload("fullName", func(p) = p.fullName)
        .payload("workEmail", func(p) = p.workEmail)
        .payload("department", func(p) = p.department)
        .payload("jobTitle", func(p) = p.jobTitle)
        .payload("role", func(p) = MessagingLib.roleText(p.role))
        .payload("status", func(p) = MessagingLib.statusText(p.status))
        .payload("isDemo", func(p) = p.isDemo)
        .payload("registeredAt", func(p) = p.registeredAt)
        .ownedBy("principal")
        .controllerOrScoped()
        .build(),
      OQL.Entity.manual<Types.Message>("message", messageRows, "Message", "timestamp")
        .sample({ sender = anyPrincipal; recipient = anyPrincipal; content = ""; timestamp = 0 })
        .payload("sender", func(m) = m.sender)
        .payload("recipient", func(m) = m.recipient)
        .payload("content", func(m) = m.content)
        .payload("timestamp", func(m) = m.timestamp)
        .controllerOnly()
        .build(),
      OQL.Entity.manual<Types.Invite>("invite", inviteRows, "Invite", "id")
        .sample({
          id = 0;
          fullName = "";
          workEmail = "";
          phone = "";
          department = "";
          role = #member;
          linkToken = "";
          code = "";
          status = #pending;
          createdBy = anyPrincipal;
          createdAt = 0;
          expiresAt = 0;
          wrongCodeAttempts = 0;
        })
        .payload("id", func(i) = i.id)
        .payload("fullName", func(i) = i.fullName)
        .payload("workEmail", func(i) = i.workEmail)
        .payload("phone", func(i) = i.phone)
        .payload("department", func(i) = i.department)
        .payload("role", func(i) = MessagingLib.roleText(i.role))
        .payload("status", func(i) = inviteStatusText(i.status))
        .payload("createdBy", func(i) = i.createdBy)
        .payload("createdAt", func(i) = i.createdAt)
        .payload("expiresAt", func(i) = i.expiresAt)
        .payload("wrongCodeAttempts", func(i) = i.wrongCodeAttempts)
        .controllerOnly()
        .build(),
    ];
  });
};
