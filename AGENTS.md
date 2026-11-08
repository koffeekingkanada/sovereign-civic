# Project Guidance

## User Preferences

- Clean, professional, government-appropriate interface using navy and neutral grays
- No crypto or flashy styling; minimal and official-looking
- Mobile-responsive throughout
- Internet Identity is the only sign-in method
- Never claim messages are encrypted or totally secure
- Enforce all access rules in the backend canister, not only in the UI
- Clean, professional, official-looking interface using navy and neutral grays
- White-label branding driven by a single config file so the app can be reskinned for any organization
- The header emblem is a flat round navy-and-gold SCS badge, reused at the centre of the feature wheel
- The sign-in page uses the supplied vault image as a darkened background
- The sign-in intro is a vault-closing animation of at most 4 seconds with a Skip button and a reduced-motion fallback
- A small 'Powered by the Internet Computer' note appears at the bottom of the sign-in page and in the footer

## Accepted Requirements

- One-to-one messages are stored unencrypted in the backend and returned only to the two participants
- Remove the lock icon and 'End-to-end encrypted' text from conversations
- Replace the sovereignty statement on the Login and About pages with the supplied wording
- Preserve all users, roles and statuses with no data reset
- Change the default organization name in the branding configuration to "Demo Organization" for header and footer
- Remove province and government references from user-visible copy, using "staff" or "your organization"
- Replace the About page first paragraph with the supplied wording and leave the rest of the About page unchanged
- Replace the header emblem with an original navy-and-gold vault-door logo
- Add a large faint vault-door watermark behind the Login and About page content
- Add a max-5-second animated Login intro with a Skip button showing the vault logo with labelled circles in a ring connected by lines, solid circles for Directory, Private Messaging, Admin Approval, Internet Identity and Independent Infrastructure and faded Roadmap circles for End-to-End Encryption, Canadian Hosting, File Sharing, Documents and Email, with the wheel remaining beside the sign-in button and reduced motion respected
- On phones and tablets the Return key adds a new line and messages send only via the Send button; on computers Enter sends and Shift+Enter adds a new line
- Preserve all users, roles, statuses and messages
- Play the supplied vault entry video once per session after a successful sign-in, full-screen and muted
- Tapping anywhere skips the entry video
- Fade from white into the Directory when the video ends or is skipped
- Go straight to the Directory when the video cannot load or reduced motion is on
- Remove the public access-request form
- A signed-in user without an approved account sees only "Access is by invitation. Contact your organization's administrator."
- Admins create invites with full name, email, phone number, department and role
- Each invite produces a single-use invite link and a separate 6-digit code shown to the admin
- The invite link leads to Internet Identity sign-in then 6-digit code entry
- A matching link and code create an approved account with the admin-set department and role
- Each invite works once, expires after 7 days, and can be cancelled by an admin
- After 5 wrong codes the invite is cancelled
- Department Admins can only invite people into their own department
- The Admin page lists all invites with status, who created them, and when
- Enforce all invite rules in the backend canister, not only in the interface

## Verified Commands

- **typecheck**: `pnpm -r typecheck`
- **fix**: `pnpm -r fix`
- **build**: `pnpm -r build`

## Learnings

- EntryVideoOverlay.tsx now starts playback explicitly in a mount effect with a retriedRef one-shot retry, in addition to the autoPlay attribute; the finish callback is stable via useCallback([onDone]) so the effect runs once on mount.
- Local preflight cannot positively observe the entry video overlay: after sign-in the Directory renders directly with no overlay and no observable video asset request, which is equally consistent with the required reduced-motion and video-load fallbacks, so playback, tap-to-skip, the white fade and once-per-session behavior stay unverified by local testing.
- LoginPage's sign-in intro is gated on introDone initialized from prefersReducedMotion(); the local preflight environment reports reduced motion, so the intro, the lock-shake and the 'Unlock the vault' button never render there and the sign-in content shows directly. The intro, its settle timing and the unlock button stay unverified by local testing.
- The vault background image src/frontend/public/assets/images/vault-door.jpg was recompressed from 2752x1536/2.9MB to 1600px wide/110KB with sharp (jpeg quality 72, mozjpeg) and now carries width/height/sizes/fetchPriority=high; the intro paints a plain bg-primary backdrop immediately and fades the image in onLoad.
- LoginPage's intro settle timer INTRO_SETTLE_MS=3300 matches the CSS lock-shake end in index.css (2.8s delay + 0.5s duration), so the 'Unlock the vault' button appears exactly when the vault settles; the Skip button and its data-ocid login.skip_button are gone.
- The sign-in page copy ('Demo Organization', the tagline, the description and the 'Powered by the Internet Computer' note) now renders in white/light grey over the bg-primary/70 scrim in LoginPage.tsx.
- Tests that previously clicked the intro Skip button (access-gating, layout-footer, public-about, sovereignty-consistency) were updated to the unlock flow; the tester owns those files.
- VaultWheel node circles are sized by the size-[32.4%] utility on the labelled circle div (VaultWheel.tsx:116); 27% x 1.2 = 32.4% is the exact 20% increase, and the label text classes text-[0.6rem] sm:text-[0.7rem] stay unchanged.
- The capability wheel is rendered on LoginPage.tsx:228, not a separate roadmap route; the roadmap status is the faded node.roadmap circles plus the key legend.
- VaultWheel labels were shortened to 'Independent Nodes' and 'Encryption'; the node circle size utility is now size-[34%] and the label span carries break-words so 'Documents' fits on phones.
- VaultWheel.test.tsx and LoginPage.test.tsx assert the wheel labels and circle size; the tester owns those files and updates them when labels change.
- The footer build label lives in src/frontend/src/components/Layout.tsx as a sibling <p> of the 'Powered by the Internet Computer' note, styled text-xs text-muted-foreground; BUILD_VERSION and BUILD_TIMESTAMP are single named constants in that file, so a future build increments the version and updates the timestamp in one place.
- The footer environment word is computed at render time by buildEnvironment(), which tests both window.location.hostname and href for /-draft/i and falls back to 'Live' when window.location is unavailable.
- src/frontend/src/__tests__/layout-footer.test.tsx asserts the footer build label text and stubs window.location to drive the environment word; the tester owns that file.
- VaultWheel node circles are sized by the size-[30.6%] utility on the labelled circle div (VaultWheel.tsx:116); 34% x 0.9 = 30.6% is the exact 10% shrink, and the label text classes stay unchanged.
- VaultWheel.test.tsx and LoginPage.test.tsx assert the wheel labels and circle size; the tester owns those files and updates them when the size utility changes.
- The invite-only flow lives in src/backend/lib/invites.mo (createInvite, listInvites, cancelInvite, redeemInvite) with its public methods in src/backend/mixins/invites-api.mo; createInvite rejects a non-Super-Admin caller requesting role = #superAdmin, and the migration src/backend/migrations/20261107_120000.mo declares invites and nextInviteId.
- The Invite type in src/backend/types/messaging.mo carries id, fullName, workEmail, phone, department, role, linkToken, code, status (pending/used/expired/cancelled), createdBy, createdAt, expiresAt and wrongCodeAttempts; redeemInvite returns a Result value so the frontend maps each error variant.
- The invite link is the app address with the link token as an ?invite= query parameter; src/frontend/src/App.tsx reads it once from window.location in its useState initializer so it survives the Internet Identity sign-in round trip.
- src/frontend/src/components/InviteCreateForm.tsx derives its role options from the isSuper prop so a Department Admin is never offered the Super Admin option; src/frontend/src/components/InviteList.tsx shows status, creator and created date with a Cancel action for pending invites.
- src/frontend/src/components/InviteRedeem.tsx owns the 6-digit code entry and every rejection message; src/frontend/src/pages/LoginPage.tsx takes optional inviteToken and onInviteRedeemed props.
- The public access-request form is gone: src/frontend/src/App.tsx renders src/frontend/src/components/StatusScreen.tsx for both the no-profile and non-approved branches, and StatusScreen shows only the invitation message.
- src/frontend/src/__tests__/support.tsx makeActor must implement every backendInterface method, including cancelInvite, createInvite, listInvites and redeemInvite; the tester owns that file.
- Local preflight cannot reach any approved-user surface in this app: both QA identities are unapproved and see only the invitation gate, so admin invite creation, invite redemption, the invite list and the existing directory and messaging surfaces stay unverified by local testing.
- The footer build label in src/frontend/src/components/Layout.tsx is now v22; src/frontend/src/__tests__/layout-footer.test.tsx asserts that version string and the tester owns it.
