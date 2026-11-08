import { InviteStatus } from "@/backend";
import type { Invite } from "@/backend";
import { formatTimestamp } from "@/components/MessageBubble";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCancelInvite } from "@/hooks/useAdmin";
import { cn } from "@/lib/utils";
import { Loader2, MailPlus, ShieldAlert, X } from "lucide-react";

interface InviteListProps {
  invites: Invite[];
  isLoading: boolean;
  isError: boolean;
}

const STATUS_LABEL: Record<InviteStatus, string> = {
  [InviteStatus.pending]: "Pending",
  [InviteStatus.used]: "Used",
  [InviteStatus.expired]: "Expired",
  [InviteStatus.cancelled]: "Cancelled",
};

const STATUS_CLASS: Record<InviteStatus, string> = {
  [InviteStatus.pending]: "border-accent bg-accent/15 text-foreground",
  [InviteStatus.used]: "border-border bg-secondary text-foreground",
  [InviteStatus.expired]: "border-border bg-muted text-muted-foreground",
  [InviteStatus.cancelled]:
    "border-destructive/40 bg-destructive/10 text-destructive",
};

function StatusBadge({ status }: { status: InviteStatus }) {
  return (
    <Badge variant="outline" className={cn("border", STATUS_CLASS[status])}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

function InviteSkeleton() {
  return (
    <div data-ocid="admin.invites.loading_state" className="space-y-3 p-4">
      {["a", "b", "c"].map((id) => (
        <Skeleton key={id} className="h-16 w-full" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      data-ocid="admin.invites.empty_state"
      className="flex flex-col items-center gap-2 px-4 py-10 text-center"
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <MailPlus className="size-5" aria-hidden="true" />
      </div>
      <p className="font-medium text-foreground">No invites yet</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Invites you create will be listed here with their status.
      </p>
    </div>
  );
}

/**
 * Every invite the caller may see, with its status, who created it and when.
 * A pending invite can be cancelled from the list.
 */
export function InviteList({ invites, isLoading, isError }: InviteListProps) {
  const cancel = useCancelInvite();

  if (isLoading) return <InviteSkeleton />;

  if (isError) {
    return (
      <div
        data-ocid="admin.invites.error_state"
        className="flex flex-col items-center gap-2 px-4 py-10 text-center"
      >
        <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <ShieldAlert className="size-5" aria-hidden="true" />
        </div>
        <p className="font-medium text-foreground">
          Invites could not be loaded
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Refresh the page to try again.
        </p>
      </div>
    );
  }

  if (invites.length === 0) return <EmptyState />;

  return (
    <ul data-ocid="admin.invites.list" className="divide-y divide-border">
      {invites.map((invite, i) => {
        const n = i + 1;
        const isPending = invite.status === InviteStatus.pending;
        const busy = cancel.isPending && cancel.variables === invite.id;
        return (
          <li
            key={invite.id.toString()}
            data-ocid={`admin.invites.item.${n}`}
            className="flex flex-col gap-3 px-4 py-4 md:grid md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_auto] md:items-center md:gap-5 md:px-5"
          >
            <div className="min-w-0">
              <p className="break-words font-medium text-foreground">
                {invite.fullName}
              </p>
              <p className="break-all text-sm text-muted-foreground">
                {invite.workEmail}
              </p>
            </div>
            <div className="min-w-0 text-sm text-muted-foreground">
              <p className="text-foreground">{invite.department}</p>
              <p>
                Created by {invite.createdBy.toString().slice(0, 12)}… on{" "}
                {formatTimestamp(invite.createdAt) || "an unknown date"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <StatusBadge status={invite.status} />
              {isPending ? (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  data-ocid={`admin.invites.cancel_button.${n}`}
                  disabled={busy}
                  onClick={() => cancel.mutate(invite.id)}
                >
                  {busy ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <X className="size-4" aria-hidden="true" />
                  )}
                  Cancel
                </Button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
