import type { Profile } from "@/backend";
import { Status } from "@/backend";
import { VaultLogo } from "@/components/VaultLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { branding } from "@/lib/config";
import { Clock, ShieldAlert, ShieldX } from "lucide-react";

interface StatusScreenProps {
  profile: Profile;
  onEditDetails?: () => void;
}

export const AWAITING_APPROVAL_MESSAGE =
  "Your access request is awaiting approval by an administrator";

const STATUS_LABEL: Record<Status, string> = {
  [Status.pending]: "Pending",
  [Status.denied]: "Denied",
  [Status.suspended]: "Suspended",
  [Status.approved]: "Approved",
};

const STATUS_ICON: Record<Status, typeof Clock> = {
  [Status.pending]: Clock,
  [Status.denied]: ShieldX,
  [Status.suspended]: ShieldAlert,
  [Status.approved]: Clock,
};

export function StatusScreen({ profile, onEditDetails }: StatusScreenProps) {
  const Icon = STATUS_ICON[profile.status];
  const label = STATUS_LABEL[profile.status];
  const showBadge = profile.status !== Status.pending;
  const detailsIncomplete =
    !profile.workEmail.trim() ||
    !profile.department.trim() ||
    !profile.jobTitle.trim();

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

        <div className="mt-6 flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1
              data-ocid="status.name"
              className="break-words font-display text-xl font-semibold tracking-tight text-foreground"
            >
              {profile.fullName}
            </h1>
            {showBadge ? (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Current status
                </span>
                <Badge
                  variant="destructive"
                  data-ocid="status.badge"
                  className="rounded-sm"
                >
                  {label}
                </Badge>
              </div>
            ) : null}
          </div>
        </div>

        <p
          data-ocid="status.message"
          className="mt-4 text-sm leading-relaxed text-foreground"
        >
          {AWAITING_APPROVAL_MESSAGE}
        </p>

        {onEditDetails && detailsIncomplete ? (
          <div
            data-ocid="status.incomplete_notice"
            className="mt-6 rounded-md border border-border bg-muted px-4 py-3"
          >
            <p className="text-sm text-foreground">
              Your profile is missing some details. Add your work email,
              department and job title so an administrator can review your
              request.
            </p>
            <Button
              type="button"
              variant="outline"
              data-ocid="status.edit_button"
              onClick={onEditDetails}
              className="mt-3 w-full rounded-md"
            >
              Complete your details
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
