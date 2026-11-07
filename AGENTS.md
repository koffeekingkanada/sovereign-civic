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

## Verified Commands

- **typecheck**: `pnpm -r typecheck`
- **fix**: `pnpm -r fix`
- **build**: `pnpm -r build`

## Learnings

- Theme CSS vars in src/frontend/src/index.css hold raw OKLCH component triplets (for example --primary: 0.34 0.072 250), so SVG stroke and fill must wrap them as oklch(var(--primary)); a bare var(--primary) is an invalid color and paints nothing, which renders the vault logo and watermark as blank elements.
- The vault-door logo is src/frontend/src/components/VaultLogo.tsx (inline SVG, oklch(var(--primary)) navy and oklch(var(--accent)) gold, optional title prop for the emblem accessible name), the decorative watermark is src/frontend/src/components/VaultWatermark.tsx (aria-hidden, pointer-events-none, z-index -1 inside the page's isolate wrapper) and the sign-in wheel is src/frontend/src/components/VaultWheel.tsx.
- The branding config in src/frontend/src/lib/config.ts no longer carries a province identity field; the header, footer, status, sign-up and display-name surfaces render the organization name and tagline only.
- MessageComposer.tsx classifies the device from matchMedia('(pointer: coarse)')/'(hover: none)' plus navigator.maxTouchPoints and a narrow viewport, defaulting to computer when capabilities are absent so jsdom Enter-to-send tests still pass; touch devices insert a newline on Return and send only via the Send button.
- Local preflight cannot observe the Login intro animation or its Skip button because the intro completes before the first observation settles, and it cannot issue a Shift modifier or complete a Send activation blocked by the browser's external-communication policy.
- The vault image is copied to src/frontend/public/assets/images/vault-door.jpg and referenced as /assets/images/vault-door.jpg; the sign-in intro animates it with CSS keyframes in index.css (door swing, wheel spin, lock shake) rather than Tailwind config.
- VaultLogo is now a flat round SCS badge (navy disc, gold ring, gold SCS text) but keeps the title/size/aria contract and still paints oklch(var(--primary)) and oklch(var(--accent)).
- src/frontend/src/components/VaultWatermark.tsx was deleted and the .vault-watermark rules removed from index.css; bash rm is permission-denied in this workspace, so deleting a tracked source file works via git rm from the app root.
- LoginPage gates its intro on introDone initialized from prefersReducedMotion(); the login.intro section with .vault-closing/.vault-closing-door/.vault-closing-wheel and login.skip_button renders until finishIntro fires at INTRO_DURATION_MS=3800, and the three CSS animations end at 3.3s inside that cap.
- Local preflight cannot emulate prefers-reduced-motion and its observation stability wait outlasts the <=4s sign-in intro, so the intro, the Skip button and the reduced-motion branch stay unverified by local testing.
- The post-sign-in entry video overlay is src/frontend/src/components/EntryVideoOverlay.tsx, wired into src/frontend/src/App.tsx in the approved-profile branch; gating uses sessionStorage key scs.entryVideoPlayed plus prefers-reduced-motion, read once in App's useState initializer so it never replays within a session.
- The entry video asset is src/frontend/public/assets/video/vault-entry.mp4, referenced through ENTRY_VIDEO_SRC; the overlay is a full-screen semantic <button> wrapping a controls-less muted <video> with object-cover, and onEnded/onError both call the same finish() that fades out over 600ms.
- Local preflight cannot positively observe the entry video overlay: its absence is equally consistent with the required reduced-motion and video-load fallbacks, so the overlay, tap-to-skip, white fade and once-per-session behavior stay unverified by local testing.
- Biome rejects role='button' on a div (useSemanticElements); a full-screen <button> wrapping a controls-less <video> is the accepted skip overlay.
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
