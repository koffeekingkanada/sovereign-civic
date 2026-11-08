import { VaultLogo } from "@/components/VaultLogo";
import { branding } from "@/lib/config";

/**
 * The single message shown to any signed-in caller who does not have an
 * approved account. Access is invitation-only, so this screen offers no form,
 * no status detail and no action — only the instruction to contact an
 * administrator.
 */
export const AWAITING_APPROVAL_MESSAGE =
  "Access is by invitation. Contact your organization's administrator.";

/**
 * The non-approved screen. It renders only the invitation message so no public
 * sign-up path and no self-service action remain for a caller the backend has
 * not approved.
 */
export function StatusScreen() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-8 md:py-12">
      <div
        data-ocid="status.panel"
        className="rounded-lg border border-border bg-card p-6 shadow-card-resting md:p-8"
      >
        <div className="flex items-center gap-3">
          <VaultLogo
            size={44}
            title={`${branding.organizationName} emblem`}
            className="rounded-sm border border-border p-1"
          />
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {branding.organizationName}
          </p>
        </div>

        <p
          data-ocid="status.message"
          className="mt-6 text-base leading-relaxed text-foreground"
        >
          {AWAITING_APPROVAL_MESSAGE}
        </p>
      </div>
    </div>
  );
}
