mixin () {
  public query func getApiDoc() : async Text {
    "# Sovereign Civic Systems — Backend API\n" #
    "\n" #
    "Sovereign Civic Systems is a secure 1-to-1 messaging service for provincial\n" #
    "government use. The backend stores user profiles and private messages on the\n" #
    "Internet Computer. Messages are stored on tamper-resistant Internet Computer\n" #
    "infrastructure operated by independent node providers.\n" #
    "\n" #
    "Messages are stored as plain text in the backend and are returned only to the\n" #
    "two participants of each conversation. End-to-end encryption and hosting on\n" #
    "Canadian-located nodes are on the development roadmap.\n" #
    "\n" #
    "Access is approval-based. Every user has a role (`superAdmin`, `departmentAdmin`,\n" #
    "`member`) and a status (`pending`, `approved`, `denied`, `suspended`). Only\n" #
    "`approved` users can list the directory, send messages or read messages.\n" #
    "\n" #
    "## Authentication and identity\n" #
    "\n" #
    "Internet Identity is the only sign-in method. Every mutating method requires a\n" #
    "signed (non-anonymous) caller; anonymous callers are rejected with a trap.\n" #
    "\n" #
    "The app's frontend pins an Internet Identity derivation origin, published at\n" #
    "`/.well-known/ii-derivation-origin` when available. An agent already holding the\n" #
    "user's Internet Identity authorization derives the correct per-app principal\n" #
    "against that origin (for example `icp identity link web <name> --app <host>`).\n" #
    "Such a delegation acts with the user's full authority in this app until it\n" #
    "expires.\n" #
    "\n" #
    "Registration is a prerequisite. Access is by invitation: a direct API caller\n" #
    "must be invited by an admin and then call `redeemInvite` once as a signed-in\n" #
    "caller to create an approved account. The FIRST non-anonymous principal to\n" #
    "register through `registerProfile` becomes the Super Admin with status\n" #
    "`approved`; every subsequent `registerProfile` registrant is a `member` with\n" #
    "status `pending`. A principal that never signed in through the app's own\n" #
    "frontend is unregistered even when it belongs to the app's owner, and a\n" #
    "signed-in caller derived against a different origin is a different principal\n" #
    "than the one the frontend registered.\n" #
    "\n" #
    "Super Admin resolution: the Super Admin is the first registrant and is stored as\n" #
    "an ordinary profile with role `superAdmin` and status `approved`. Super Admin\n" #
    "status is claimed only once — once a Super Admin profile exists, no later\n" #
    "registrant can become Super Admin. Nobody else can obtain the `superAdmin` role.\n" #
    "\n" #
    "Role and status are never set by the caller. `registerProfile` cannot change them\n" #
    "(a repeat call only edits the four text fields); they change only through the\n" #
    "admin methods below.\n" #
    "\n" #
    "Guarded methods trap for callers who are not allowed:\n" #
    "- `listDirectory`, `getDirectoryEntry`, `sendMessage`, `getThread` trap with\n" #
    "  `Access denied: your access request has not been approved` for any caller\n" #
    "  (anonymous, unregistered, pending, denied or suspended) who is not approved.\n" #
    "- Admin methods trap with `Access denied: administrators only` unless the caller\n" #
    "  is the Super Admin or an approved Department Admin.\n" #
    "- `appointDepartmentAdmin`, `removeDepartmentAdmin`, `setDemoAccount` trap with\n" #
    "  `Access denied: only the Super Admin can do this` for everyone else.\n" #
    "\n" #
    "A Department Admin manages only users whose department matches their own\n" #
    "(trimmed, case-insensitive). The Super Admin manages everyone. Nobody can\n" #
    "approve, deny, suspend or otherwise modify the Super Admin, and nobody can act\n" #
    "on their own account.\n" #
    "\n" #
    "## Message storage and access\n" #
    "\n" #
    "A conversation is the unordered pair of its two participants. `sendMessage`\n" #
    "stores the message text in both participants' threads, and `getThread` returns\n" #
    "the messages between the caller and one other user, in both directions, oldest\n" #
    "to newest. The backend enforces that a thread is readable only by its two\n" #
    "participants: `getThread` returns only messages where the caller is the sender\n" #
    "or the recipient, and it traps for a caller who is not an approved user.\n" #
    "\n" #
    "Messages are stored as plain text. The backend does not encrypt message content\n" #
    "and does not claim to; end-to-end encryption is on the development roadmap.\n" #
    "\n" #
    "## Methods\n" #
    "\n" #
    "### registerProfile(fullName, workEmail, department, jobTitle : Text) : async Profile\n" #
    "Creates the caller's profile on first call, storing the current time as\n" #
    "`registeredAt` (the request date). The first registrant becomes `superAdmin` /\n" #
    "`approved`; every later registrant becomes `member` / `pending`. Later calls\n" #
    "update only the four text fields and never change role, status, `isDemo` or\n" #
    "`registeredAt`. All four fields are trimmed and must be non-empty. Anonymous\n" #
    "callers trap. A Department Admin cannot change their department.\n" #
    "\n" #
    "### getMyProfile() : async ?Profile\n" #
    "Returns the caller's profile, or `null` if not registered. Read-only query,\n" #
    "available to every status so the app can show a status screen.\n" #
    "\n" #
    "### listDirectory() : async [DirectoryEntry]\n" #
    "Approved callers only. Returns approved users as\n" #
    "`{ principal; displayName; isDemo }`.\n" #
    "\n" #
    "### getDirectoryEntry(user : Principal) : async ?DirectoryEntry\n" #
    "Approved callers only. Returns the entry for an approved user, else `null`.\n" #
    "\n" #
    "### sendMessage(recipient : Principal, content : Text) : async Message\n" #
    "Approved callers only. `content` is the message text; the backend stores it as\n" #
    "plain text. Traps when the recipient is the caller, is not an approved user\n" #
    "(`Recipient is not an approved user`), or when the trimmed content is empty\n" #
    "(`Message cannot be empty`). The message is stored in both participants'\n" #
    "threads.\n" #
    "\n" #
    "### getThread(other : Principal) : async [Message]\n" #
    "Approved callers only. Returns the thread between the caller and `other`, both\n" #
    "directions, oldest to newest, as plain text. Read-only query.\n" #
    "\n" #
    "### listPendingRequests() : async [Profile]\n" #
    "Admins only. Pending requests in the admin's scope, oldest first.\n" #
    "\n" #
    "### listApprovedUsers() : async [Profile]\n" #
    "Admins only. Approved users in the admin's scope (the Super Admin sees everyone).\n" #
    "\n" #
    "### listSuspendedUsers() : async [Profile]\n" #
    "Admins only. Suspended users in the admin's scope, oldest first.\n" #
    "\n" #
    "### approveUser(user) / denyUser(user) : async Profile\n" #
    "Admins only. The target must be `pending` and in the admin's scope.\n" #
    "\n" #
    "### suspendUser(user : Principal) : async Profile\n" #
    "Admins only. The target must be `approved` and in scope. A suspended Department\n" #
    "Admin is demoted to `member`; only the Super Admin can suspend a Department Admin.\n" #
    "Suspending never deletes the profile or any messages.\n" #
    "\n" #
    "### reinstateUser(user : Principal) : async Profile\n" #
    "Admins only. The target must be `suspended` and in scope; the same authorization\n" #
    "scope as `suspendUser`. Sets the status back to `approved` and leaves the profile\n" #
    "and all messages intact. Only the Super Admin can reinstate a Department Admin.\n" #
    "\n" #
    "### appointDepartmentAdmin(user) / removeDepartmentAdmin(user) : async Profile\n" #
    "Super Admin only. Appoint requires an approved `member` with a department;\n" #
    "remove sets the role back to `member`.\n" #
    "\n" #
    "### setDemoAccount(user : Principal, isDemo : Bool) : async Profile\n" #
    "Super Admin only. Marks or unmarks a registered user as a Demo account; the\n" #
    "target cannot be the Super Admin. Demo accounts carry `isDemo = true`, which the\n" #
    "directory exposes so the UI can show a DEMO badge.\n" #
    "\n" #
    "## Invitations\n" #
    "\n" #
    "Access is by invitation. A signed-in user without an approved account sees only\n" #
    "the message \"Access is by invitation. Contact your organization's administrator.\"\n" #
    "and cannot use the directory or messaging. Admins create invites; the invite\n" #
    "produces a single-use link token and a separate 6-digit code, both shown to the\n" #
    "creating admin. The app never delivers the link or the code automatically.\n" #
    "\n" #
    "### createInvite(fullName, workEmail, phone, department : Text, role : Role) : async Invite\n" #
    "Admins only. Creates a single-use invite and returns it, including `linkToken`\n" #
    "and `code`. All four text fields are trimmed and must be non-empty. A Department\n" #
    "Admin may only invite into their own department (trimmed, case-insensitive); the\n" #
    "Super Admin may invite into any department. The invite starts `pending` and\n" #
    "expires 7 days after creation.\n" #
    "\n" #
    "### listInvites() : async [Invite]\n" #
    "Admins only. Returns invites in the admin's scope (the Super Admin sees all, a\n" #
    "Department Admin sees only their own department), newest first. A pending invite\n" #
    "whose expiry has passed is reported as `expired`.\n" #
    "\n" #
    "### cancelInvite(inviteId : Nat) : async Invite\n" #
    "Admins only. Cancels a `pending` invite in the admin's scope. Traps when the\n" #
    "invite is not found, is out of scope, or is already `used`, `expired` or\n" #
    "`cancelled`.\n" #
    "\n" #
    "### redeemInvite(linkToken : Text, code : Text) : async Result<Profile, RedeemError>\n" #
    "Signed-in (non-anonymous) callers. Redeems an invite from its link token plus\n" #
    "the 6-digit code. On success the caller's account is created and `approved` with\n" #
    "the invite's department and role, and the invite becomes `used`. Failures are\n" #
    "returned as `#err(RedeemError)`, not traps, so a wrong-code attempt is recorded:\n" #
    "`#notFound`, `#used`, `#expired`, `#cancelled`, `#wrongCode({ remaining })` and\n" #
    "`#tooManyAttempts`. After 5 wrong codes the invite is cancelled and further\n" #
    "attempts return `#cancelled`. Anonymous callers trap.\n" #
    "\n" #
    "Invite status is `#pending | #used | #expired | #cancelled`. An invite is\n" #
    "single-use: once `used` it can never be redeemed again. `Invite` is\n" #
    "`{ id; fullName; workEmail; phone; department; role; linkToken; code; status;\n" #
    "createdBy; createdAt; expiresAt; wrongCodeAttempts }`.\n" #
    "\n" #
    "### Generic authorization and OQL endpoints\n" #
    "The authorization component's methods (such as `getCallerUserRole`,\n" #
    "`isCallerAdmin`, `assignCallerUserRole`, `_initialize_access_control`) are also\n" #
    "exposed but are NOT what gates this app: access is decided solely by the profile\n" #
    "role and status above. The OQL endpoints `schema` and `execute` expose the\n" #
    "`profile` table to a signed-in caller as their own row only (other users' work\n" #
    "emails are not readable, even by admins), and the `message` and `invite` tables\n" #
    "are readable only by the canister controllers, never by ordinary callers. The\n" #
    "`invite` table omits the `linkToken` and `code` columns entirely.\n" #
    "\n" #
    "## Units and encodings\n" #
    "\n" #
    "- `Timestamp` is a `Nat` in nanoseconds since the Unix epoch (`Time.now()`).\n" #
    "- `UserId` is a `Principal`.\n" #
    "- `Role` is `#superAdmin | #departmentAdmin | #member`.\n" #
    "- `Status` is `#pending | #approved | #denied | #suspended`.\n" #
    "- `Profile` is `{ principal; fullName; workEmail; department; jobTitle; role; status; isDemo; registeredAt }`.\n" #
    "- `DirectoryEntry` is `{ principal; displayName; isDemo }`.\n" #
    "- `Message` is `{ sender; recipient; content; timestamp }`; `content` is the\n" #
    "  plain text message body.\n" #
    "- Optional values are Candid `opt`; absent profiles are `null`.\n" #
    "\n" #
    "## Lifecycle and polling\n" #
    "\n" #
    "Status moves `pending` -> `approved` or `denied`, and `approved` -> `suspended`.\n" #
    "A suspended user can be reinstated back to `approved` with `reinstateUser`; a\n" #
    "denied user is not reinstated by this API. A pending user can\n" #
    "poll `getMyProfile` to learn when the status changes. `getThread` is a query and\n" #
    "reflects committed state only; poll it periodically to surface new messages.\n" #
    "\n" #
    "## Mutation retry safety\n" #
    "\n" #
    "`registerProfile` is idempotent for the same inputs. `approveUser`, `denyUser`,\n" #
    "`suspendUser` and `reinstateUser` trap on a repeat call because the target is no\n" #
    "longer in the required status. `setDemoAccount` is idempotent. `sendMessage` is NOT idempotent\n" #
    "— each successful call appends a new message, so do not blindly retry it.\n" #
    "\n" #
    "## Errors and limits\n" #
    "\n" #
    "Caller errors are reported as traps (rejected calls), not typed error variants.\n" #
    "Common trap messages: `User not found` (unregistered target),\n" #
    "`Access denied: user belongs to another department`,\n" #
    "`The Super Admin cannot be modified`, `You cannot act on your own account`,\n" #
    "`Only pending requests can be approved` / `denied`,\n" #
    "`Only approved users can be suspended`, `Only suspended users can be reinstated`,\n" #
    "`Cannot send a message to yourself`,\n" #
    "`Message cannot be empty`, `Anonymous callers cannot register`.\n" #
    "Text inputs are trimmed before storage. There is no message size limit enforced\n" #
    "by the backend beyond the platform's ingress limits.\n";
  };
};
