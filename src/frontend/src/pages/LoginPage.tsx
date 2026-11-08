import { useCallback, useEffect, useRef, useState } from "react";

import { InviteRedeem } from "@/components/InviteRedeem";
import { VaultLogo } from "@/components/VaultLogo";
import { VaultWheel } from "@/components/VaultWheel";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { branding } from "@/lib/config";
import { ShieldCheck } from "lucide-react";

/**
 * The exact sovereignty framing sentence required on both the Login and About
 * pages. Kept as a single constant so the wording stays character-for-character
 * identical wherever it is rendered.
 */
export const SOVEREIGNTY_FRAMING =
  "Messages are stored on tamper-resistant Internet Computer infrastructure operated by independent node providers, and are only shown to the two people in each conversation. End-to-end encryption and hosting on Canadian-located nodes are on the development roadmap.";

/**
 * How long the vault-closing sequence runs before it settles on the locked
 * vault. The door swing, wheel spin and lock shake finish inside this window,
 * after which the "Unlock the vault" action is revealed.
 */
const INTRO_SETTLE_MS = 3300;

/** Darkened vault image used as the sign-in page background. */
const VAULT_IMAGE = "/assets/images/vault-door.jpg";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface LoginPageProps {
  /** Opens the public About page from the sign-in card. */
  onOpenAbout?: () => void;
  /**
   * The single-use invite token carried by an invite link. When present the
   * page frames sign-in as accepting an invitation, and once the person is
   * signed in it hands off to the 6-digit code entry.
   */
  inviteToken?: string | null;
  /** Called once an invite has been redeemed and the account approved. */
  onInviteRedeemed?: () => void;
}

export function LoginPage({
  onOpenAbout,
  inviteToken,
  onInviteRedeemed,
}: LoginPageProps) {
  const { login, isLoggingIn, isLoginError, loginError, isAuthenticated } =
    useAuth();

  // Reduced-motion users skip the intro entirely and see the sign-in content
  // directly, with no entrance animation.
  const [introDone, setIntroDone] = useState(() => prefersReducedMotion());
  // The locked vault settles first; only then is the unlock action revealed.
  const [introReady, setIntroReady] = useState(() => prefersReducedMotion());
  // The vault photo fades in once it has decoded, so the plain navy backdrop
  // shows immediately instead of a blank or half-loaded image.
  const [imageLoaded, setImageLoaded] = useState(false);
  const settleRef = useRef<number | null>(null);

  const unlock = useCallback(() => {
    if (settleRef.current !== null) {
      window.clearTimeout(settleRef.current);
      settleRef.current = null;
    }
    setIntroDone(true);
  }, []);

  useEffect(() => {
    if (introDone || introReady) return;
    settleRef.current = window.setTimeout(() => {
      settleRef.current = null;
      setIntroReady(true);
    }, INTRO_SETTLE_MS);
    return () => {
      if (settleRef.current !== null) {
        window.clearTimeout(settleRef.current);
        settleRef.current = null;
      }
    };
  }, [introDone, introReady]);

  // An invite link leads to Internet Identity sign-in and then to the 6-digit
  // code entry. Once the person is signed in, the code entry replaces the
  // sign-in card so the invitation is completed in one place.
  if (inviteToken && isAuthenticated) {
    return (
      <div className="relative isolate overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10 bg-primary"
        >
          <img
            src={VAULT_IMAGE}
            alt=""
            width={1600}
            height={893}
            sizes="100vw"
            loading="eager"
            decoding="async"
            fetchPriority="high"
            onLoad={() => setImageLoaded(true)}
            className={`h-full w-full object-cover transition-opacity duration-700 ease-out ${
              imageLoaded ? "opacity-40" : "opacity-0"
            }`}
          />
          <div className="absolute inset-0 bg-primary/70" />
        </div>
        <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-8 md:py-12">
          <InviteRedeem
            linkToken={inviteToken}
            onRedeemed={() => onInviteRedeemed?.()}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative isolate overflow-hidden">
      {/* Plain navy backdrop painted immediately, with the vault photo fading
          in over it once loaded. Fixed and non-interactive so it never
          intercepts clicks on the sign-in controls. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-primary"
      >
        <img
          src={VAULT_IMAGE}
          alt=""
          width={1600}
          height={893}
          sizes="100vw"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          onLoad={() => setImageLoaded(true)}
          className={`h-full w-full object-cover transition-opacity duration-700 ease-out ${
            imageLoaded ? "opacity-40" : "opacity-0"
          }`}
        />
        <div className="absolute inset-0 bg-primary/70" />
      </div>

      {!introDone ? (
        <section
          data-ocid="login.intro"
          aria-label="Service introduction"
          className="relative mx-auto flex min-h-[80vh] max-w-3xl flex-col items-center justify-center gap-10 px-4 py-12 md:py-20"
        >
          <div className="vault-closing relative aspect-square w-full max-w-md overflow-hidden rounded-lg border border-border shadow-card-resting">
            <img
              src={VAULT_IMAGE}
              alt=""
              loading="eager"
              decoding="async"
              className="vault-closing-door h-full w-full object-cover"
            />
            {/* Spinning centre wheel overlay, aligned to the vault hub. */}
            <span
              aria-hidden="true"
              className="vault-closing-wheel absolute left-1/2 top-1/2 size-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-accent/70"
            />
          </div>

          {/* The unlock action appears only after the vault has settled on its
              locked state, and carries a soft, slow glowing pulse. */}
          <div
            className={`flex h-16 items-center justify-center transition-opacity duration-500 ${
              introReady ? "opacity-100" : "opacity-0"
            }`}
          >
            {introReady ? (
              <span className="relative inline-flex">
                {/* Soft, slow glowing halo behind the action. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 animate-pulse rounded-full bg-accent/40 blur-md"
                />
                <Button
                  type="button"
                  data-ocid="login.unlock_button"
                  onClick={unlock}
                  className="relative h-14 rounded-full px-10 text-base font-semibold shadow-lg ring-2 ring-accent/60"
                >
                  Unlock the vault
                </Button>
              </span>
            ) : null}
          </div>
        </section>
      ) : (
        <div className="relative mx-auto grid max-w-5xl gap-10 px-4 py-12 md:grid-cols-2 md:items-center md:gap-14 md:px-6 md:py-20">
          <div className="motion-safe:animate-fade-in-up space-y-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/80">
              {branding.organizationName}
            </p>
            <h1 className="font-display text-4xl font-bold tracking-tight text-white md:text-5xl">
              {branding.organizationName}
            </h1>
            <p className="max-w-md text-lg text-white/90">{branding.tagline}</p>
            <div className="rule-gold h-0.5 w-24" aria-hidden="true" />
            <p className="max-w-md text-sm text-white/80">
              {inviteToken
                ? "You have been invited to join. Sign in with Internet Identity to continue, then enter the 6-digit code your administrator gave you."
                : "A directory and direct messaging service for your organization's staff. Access is granted through Internet Identity — the only supported sign-in method."}
            </p>
          </div>

          <div className="motion-safe:animate-fade-in-up rounded-lg border border-border bg-card p-6 shadow-card-resting md:p-8">
            <div className="mb-6 flex items-center gap-3">
              <VaultLogo
                size={48}
                title={`${branding.organizationName} emblem`}
                className="rounded-full border border-border p-1"
              />
              <div>
                <p className="font-display text-base font-semibold text-foreground">
                  {inviteToken ? "Accept your invitation" : "Sign in"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Internet Identity required
                </p>
              </div>
            </div>

            <ul className="mb-6 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <ShieldCheck
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                Your identity is verified by Internet Identity.
              </li>
            </ul>

            <Button
              type="button"
              data-ocid="login.sign_in_button"
              onClick={login}
              disabled={isLoggingIn}
              className="w-full rounded-md"
            >
              {isLoggingIn ? "Connecting…" : "Sign in with Internet Identity"}
            </Button>

            {isLoginError ? (
              <p
                data-ocid="login.error_state"
                role="alert"
                className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                {loginError?.message ?? "Sign-in failed. Please try again."}
              </p>
            ) : null}

            <p className="mt-4 text-xs text-muted-foreground">
              By signing in you agree to use this service in accordance with
              your organization's information management policy.
            </p>

            {onOpenAbout ? (
              <Button
                type="button"
                variant="outline"
                data-ocid="login.about_link"
                onClick={onOpenAbout}
                className="mt-4 w-full rounded-md"
              >
                About this service
              </Button>
            ) : null}
          </div>

          <div
            data-ocid="login.wheel_panel"
            className="surface-sunken flex items-center justify-center rounded-lg border border-border p-5 md:col-span-2 md:p-6"
          >
            <VaultWheel
              className="max-w-sm"
              title={`${branding.organizationName} capabilities`}
            />
          </div>

          <section
            data-ocid="login.framing_panel"
            className="surface-sunken rounded-lg border border-border p-5 md:col-span-2 md:p-6"
          >
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
              Sovereignty and scope
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              {SOVEREIGNTY_FRAMING}
            </p>
          </section>

          <p className="text-center text-xs text-white/70 md:col-span-2">
            Powered by the Internet Computer
          </p>
        </div>
      )}
    </div>
  );
}
