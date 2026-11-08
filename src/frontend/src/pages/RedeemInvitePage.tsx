import type { RedeemError } from "@/backend";
import { VaultLogo } from "@/components/VaultLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRedeemInvite } from "@/hooks/useProfile";
import { branding } from "@/lib/config";
import { CheckCircle2, KeyRound, ShieldAlert } from "lucide-react";
import { useState } from "react";

interface RedeemInvitePageProps {
  /** The single-use link token taken from the invite link. */
  linkToken: string;
  /** Called once the invite has been redeemed and the account approved. */
  onRedeemed: () => void;
}

/** Human-readable message for each backend redemption failure. */
function redeemErrorMessage(error: RedeemError): string {
  switch (error.__kind__) {
    case "wrongCode":
      return `That code is not correct. ${error.wrongCode.remaining.toString()} attempt${
        error.wrongCode.remaining === 1n ? "" : "s"
      } remaining.`;
    case "tooManyAttempts":
      return "Too many incorrect codes. This invite has been cancelled. Contact your organization's administrator.";
    case "expired":
      return "This invite has expired. Contact your organization's administrator for a new one.";
    case "cancelled":
      return "This invite has been cancelled. Contact your organization's administrator.";
    case "used":
      return "This invite has already been used.";
    case "notFound":
      return "This invite link is not valid. Check that you opened the full link from your invitation.";
  }
}

/**
 * The 6-digit code entry screen reached from an invite link after Internet
 * Identity sign-in. A matching link token and code create and approve the
 * caller's account with the department and role the administrator set.
 */
export function RedeemInvitePage({
  linkToken,
  onRedeemed,
}: RedeemInvitePageProps) {
  const [code, setCode] = useState("");
  const redeem = useRedeemInvite();

  const digits = code.replace(/\D/g, "").slice(0, 6);
  const canSubmit = digits.length === 6 && !redeem.isPending;

  const result = redeem.data;
  const failure = result && result.__kind__ === "err" ? result.err : null;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    redeem.mutate(
      { linkToken, code: digits },
      {
        onSuccess: (value) => {
          if (value.__kind__ === "ok") onRedeemed();
        },
      },
    );
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-8 md:py-12">
      <div
        data-ocid="invite.panel"
        className="rounded-lg border border-border bg-card p-6 shadow-card-resting md:p-8"
      >
        <div className="mb-2 flex items-center gap-3">
          <VaultLogo
            size={44}
            title={`${branding.organizationName} emblem`}
            className="rounded-sm border border-border p-1"
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {branding.organizationName}
            </p>
            <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
              Enter your invite code
            </h1>
          </div>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          Your invitation link is recognised. Enter the 6-digit code your
          administrator gave you to activate your account.
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-code">6-digit code</Label>
            <Input
              id="invite-code"
              data-ocid="invite.code.input"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              value={digits}
              placeholder="000000"
              aria-invalid={failure ? true : undefined}
              aria-describedby={failure ? "invite-code-error" : undefined}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="font-mono text-lg tracking-[0.5em]"
            />
          </div>

          {failure ? (
            <p
              id="invite-code-error"
              data-ocid="invite.error_state"
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              <ShieldAlert
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <span className="min-w-0 break-words">
                {redeemErrorMessage(failure)}
              </span>
            </p>
          ) : null}

          {redeem.isError ? (
            <p
              data-ocid="invite.request_error_state"
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              We could not reach the service. Please try again.
            </p>
          ) : null}

          {result && result.__kind__ === "ok" ? (
            <output
              data-ocid="invite.success_state"
              className="flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground"
            >
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              Your account is active. Opening the directory…
            </output>
          ) : null}

          <Button
            type="submit"
            data-ocid="invite.submit_button"
            disabled={!canSubmit}
            className="w-full rounded-md"
          >
            <KeyRound className="size-4" aria-hidden="true" />
            {redeem.isPending ? "Activating…" : "Activate account"}
          </Button>
        </form>
      </div>
    </div>
  );
}
