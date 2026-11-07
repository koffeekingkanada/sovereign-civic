import { Role } from "@/backend";
import type { Profile } from "@/backend";
import { formatTimestamp } from "@/components/MessageBubble";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAppointDepartmentAdmin,
  useApproveUser,
  useApprovedUsers,
  useDenyUser,
  usePendingRequests,
  useReinstateUser,
  useRemoveDepartmentAdmin,
  useSetDemoAccount,
  useSuspendUser,
  useSuspendedUsers,
} from "@/hooks/useAdmin";
import { cn } from "@/lib/utils";
import type { Principal } from "@icp-sdk/core/principal";
import {
  CheckCircle2,
  Loader2,
  RotateCcw,
  ShieldAlert,
  UserCheck,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

interface AdminPageProps {
  profile: Profile;
}

interface Notice {
  kind: "success" | "error";
  text: string;
}

const ROLE_LABEL: Record<Role, string> = {
  [Role.member]: "Member",
  [Role.departmentAdmin]: "Department Admin",
  [Role.superAdmin]: "Super Admin",
};

function errorText(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "The action could not be completed. Please try again.";
}

function SectionShell({
  ocid,
  title,
  description,
  count,
  children,
}: {
  ocid: string;
  title: string;
  description: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section
      data-ocid={`${ocid}.section`}
      className="overflow-hidden rounded-lg border border-border bg-card"
    >
      <header className="flex items-start justify-between gap-3 border-b border-border bg-secondary px-4 py-3 md:px-5">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold text-foreground">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {count !== undefined && (
          <Badge variant="secondary" className="shrink-0 border border-border">
            {count}
          </Badge>
        )}
      </header>
      {children}
    </section>
  );
}

function EmptyState({
  ocid,
  icon,
  title,
  text,
}: {
  ocid: string;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div
      data-ocid={ocid}
      className="flex flex-col items-center gap-2 px-4 py-10 text-center"
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </div>
      <p className="font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function ListSkeleton({ ocid }: { ocid: string }) {
  return (
    <div data-ocid={ocid} className="space-y-3 p-4">
      {["a", "b", "c"].map((id) => (
        <Skeleton key={id} className="h-16 w-full" />
      ))}
    </div>
  );
}

function UserIdentity({ user }: { user: Profile }) {
  return (
    <div className="min-w-0">
      <p className="flex flex-wrap items-center gap-2 font-medium text-foreground">
        <span className="break-words">{user.fullName}</span>
        {user.isDemo && (
          <Badge variant="outline" className="border-accent text-foreground">
            DEMO
          </Badge>
        )}
      </p>
      <p className="break-all text-sm text-muted-foreground">
        {user.workEmail}
      </p>
    </div>
  );
}

function UserRow({
  user,
  index,
  ocid,
  children,
}: {
  user: Profile;
  index: number;
  ocid: string;
  children: React.ReactNode;
}) {
  return (
    <li
      data-ocid={`${ocid}.item.${index}`}
      className="flex flex-col gap-3 px-4 py-4 md:grid md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_auto] md:items-center md:gap-5 md:px-5"
    >
      <UserIdentity user={user} />
      <div className="min-w-0 text-sm text-muted-foreground">
        <p className="text-foreground">{user.department}</p>
        <p>{user.jobTitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        {children}
      </div>
    </li>
  );
}

export function AdminPage({ profile }: AdminPageProps) {
  const isSuper = profile.role === Role.superAdmin;
  const myId = profile.principal.toString();

  const pending = usePendingRequests();
  const approved = useApprovedUsers();
  const suspended = useSuspendedUsers();
  const approve = useApproveUser();
  const deny = useDenyUser();
  const suspend = useSuspendUser();
  const reinstate = useReinstateUser();
  const appoint = useAppointDepartmentAdmin();
  const removeAdmin = useRemoveDepartmentAdmin();
  const setDemo = useSetDemoAccount();

  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const pendingList = pending.data ?? [];
  const approvedList = approved.data ?? [];
  const suspendedList = suspended.data ?? [];

  function run(
    start: (options: {
      onSuccess: () => void;
      onError: (e: unknown) => void;
    }) => void,
    success: string,
  ) {
    start({
      onSuccess: () => setNotice({ kind: "success", text: success }),
      onError: (e) => setNotice({ kind: "error", text: errorText(e) }),
    });
  }

  const isBusy = (id: Principal) => {
    const key = id.toString();
    return (
      (approve.isPending && approve.variables?.toString() === key) ||
      (deny.isPending && deny.variables?.toString() === key) ||
      (suspend.isPending && suspend.variables?.toString() === key) ||
      (reinstate.isPending && reinstate.variables?.toString() === key) ||
      (appoint.isPending && appoint.variables?.toString() === key) ||
      (removeAdmin.isPending && removeAdmin.variables?.toString() === key) ||
      (setDemo.isPending && setDemo.variables?.user.toString() === key)
    );
  };

  return (
    <div
      data-ocid="admin.page"
      className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-6"
    >
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Administration
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isSuper
            ? "Review sign-up requests and manage access for all departments."
            : "Review sign-up requests and manage access for your department."}
        </p>
        {!isSuper && (
          <p
            data-ocid="admin.scope_note"
            className="mt-3 inline-flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground"
          >
            <ShieldAlert className="size-4 shrink-0" aria-hidden="true" />
            <span>
              Your administration scope is limited to the{" "}
              <strong>{profile.department}</strong> department.
            </span>
          </p>
        )}
      </div>

      {notice && (
        <div
          role={notice.kind === "error" ? "alert" : "status"}
          data-ocid={
            notice.kind === "error"
              ? "admin.error_state"
              : "admin.success_state"
          }
          className={cn(
            "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
            notice.kind === "error"
              ? "border-destructive bg-destructive/10 text-destructive"
              : "border-border bg-secondary text-foreground",
          )}
        >
          {notice.kind === "error" ? (
            <ShieldAlert
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
          ) : (
            <CheckCircle2
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
          )}
          <span className="min-w-0 flex-1 break-words">{notice.text}</span>
          <button
            type="button"
            data-ocid="admin.notice.close_button"
            aria-label="Dismiss message"
            onClick={() => setNotice(null)}
            className="rounded p-1 hover:bg-muted"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <SectionShell
        ocid="admin.pending"
        title="Pending requests"
        description="Staff waiting for access to the directory."
        count={pending.isSuccess ? pendingList.length : undefined}
      >
        {pending.isLoading ? (
          <ListSkeleton ocid="admin.pending.loading_state" />
        ) : pending.isError ? (
          <EmptyState
            ocid="admin.pending.error_state"
            icon={<ShieldAlert className="size-5" />}
            title="Requests could not be loaded"
            text="Refresh the page to try again."
          />
        ) : pendingList.length === 0 ? (
          <EmptyState
            ocid="admin.pending.empty_state"
            icon={<UserCheck className="size-5" />}
            title="No pending requests"
            text="New sign-up requests will appear here for review."
          />
        ) : (
          <ul data-ocid="admin.pending.list" className="divide-y divide-border">
            {pendingList.map((user, i) => {
              const busy = isBusy(user.principal);
              const n = i + 1;
              return (
                <UserRow
                  key={user.principal.toString()}
                  user={user}
                  index={n}
                  ocid="admin.pending"
                >
                  <span className="mr-auto text-xs text-muted-foreground md:mr-3">
                    Requested {formatTimestamp(user.registeredAt) || "recently"}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    data-ocid={`admin.pending.approve_button.${n}`}
                    disabled={busy}
                    onClick={() =>
                      run(
                        (o) => approve.mutate(user.principal, o),
                        `${user.fullName} has been approved.`,
                      )
                    }
                  >
                    {approve.isPending &&
                    approve.variables?.toString() ===
                      user.principal.toString() ? (
                      <Loader2 className="animate-spin" />
                    ) : null}
                    Approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    data-ocid={`admin.pending.deny_button.${n}`}
                    disabled={busy}
                    onClick={() =>
                      run(
                        (o) => deny.mutate(user.principal, o),
                        `${user.fullName}'s request was denied.`,
                      )
                    }
                  >
                    {deny.isPending &&
                    deny.variables?.toString() === user.principal.toString() ? (
                      <Loader2 className="animate-spin" />
                    ) : null}
                    Deny
                  </Button>
                </UserRow>
              );
            })}
          </ul>
        )}
      </SectionShell>

      <SectionShell
        ocid="admin.approved"
        title="Approved users"
        description={
          isSuper
            ? "Everyone with access across all departments."
            : `Approved staff in ${profile.department}.`
        }
        count={approved.isSuccess ? approvedList.length : undefined}
      >
        {approved.isLoading ? (
          <ListSkeleton ocid="admin.approved.loading_state" />
        ) : approved.isError ? (
          <EmptyState
            ocid="admin.approved.error_state"
            icon={<ShieldAlert className="size-5" />}
            title="Users could not be loaded"
            text="Refresh the page to try again."
          />
        ) : approvedList.length === 0 ? (
          <EmptyState
            ocid="admin.approved.empty_state"
            icon={<Users className="size-5" />}
            title="No approved users yet"
            text="Approved staff will be listed here once requests are accepted."
          />
        ) : (
          <ul
            data-ocid="admin.approved.list"
            className="divide-y divide-border"
          >
            {approvedList.map((user, i) => {
              const id = user.principal.toString();
              const n = i + 1;
              const busy = isBusy(user.principal);
              const isSelf = id === myId;
              const isTargetSuper = user.role === Role.superAdmin;
              const canAct = !isSelf && !isTargetSuper;
              return (
                <UserRow key={id} user={user} index={n} ocid="admin.approved">
                  <Badge
                    variant="secondary"
                    className="mr-auto border border-border md:mr-3"
                  >
                    {ROLE_LABEL[user.role]}
                  </Badge>
                  {canAct && isSuper && (
                    <>
                      {user.role === Role.departmentAdmin ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          data-ocid={`admin.approved.remove_admin_button.${n}`}
                          disabled={busy}
                          onClick={() =>
                            run(
                              (o) => removeAdmin.mutate(user.principal, o),
                              `${user.fullName} is no longer a Department Admin.`,
                            )
                          }
                        >
                          <UserCog />
                          Remove Department Admin
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          data-ocid={`admin.approved.appoint_button.${n}`}
                          disabled={busy}
                          onClick={() =>
                            run(
                              (o) => appoint.mutate(user.principal, o),
                              `${user.fullName} is now a Department Admin.`,
                            )
                          }
                        >
                          <UserCog />
                          Appoint Department Admin
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        data-ocid={`admin.approved.demo_button.${n}`}
                        disabled={busy}
                        onClick={() =>
                          run(
                            (o) =>
                              setDemo.mutate(
                                { user: user.principal, isDemo: !user.isDemo },
                                o,
                              ),
                            user.isDemo
                              ? `${user.fullName} is no longer a demo account.`
                              : `${user.fullName} is marked as a demo account.`,
                          )
                        }
                      >
                        {user.isDemo ? "Unmark Demo" : "Mark Demo"}
                      </Button>
                    </>
                  )}
                  {canAct && (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      data-ocid={`admin.approved.suspend_button.${n}`}
                      disabled={busy}
                      onClick={() =>
                        run(
                          (o) => suspend.mutate(user.principal, o),
                          `${user.fullName} has been suspended.`,
                        )
                      }
                    >
                      {suspend.isPending &&
                      suspend.variables?.toString() === id ? (
                        <Loader2 className="animate-spin" />
                      ) : null}
                      Suspend
                    </Button>
                  )}
                </UserRow>
              );
            })}
          </ul>
        )}
      </SectionShell>

      <SectionShell
        ocid="admin.suspended"
        title="Suspended users"
        description={
          isSuper
            ? "Accounts with access revoked across all departments."
            : `Suspended staff in ${profile.department}.`
        }
        count={suspended.isSuccess ? suspendedList.length : undefined}
      >
        {suspended.isLoading ? (
          <ListSkeleton ocid="admin.suspended.loading_state" />
        ) : suspended.isError ? (
          <EmptyState
            ocid="admin.suspended.error_state"
            icon={<ShieldAlert className="size-5" />}
            title="Suspended users could not be loaded"
            text="Refresh the page to try again."
          />
        ) : suspendedList.length === 0 ? (
          <EmptyState
            ocid="admin.suspended.empty_state"
            icon={<UserCheck className="size-5" />}
            title="No suspended users"
            text="Accounts you suspend will appear here so you can restore access."
          />
        ) : (
          <ul
            data-ocid="admin.suspended.list"
            className="divide-y divide-border"
          >
            {suspendedList.map((user, i) => {
              const id = user.principal.toString();
              const n = i + 1;
              const busy = isBusy(user.principal);
              const isSelf = id === myId;
              const isTargetSuper = user.role === Role.superAdmin;
              const canAct = !isSelf && !isTargetSuper;
              return (
                <UserRow key={id} user={user} index={n} ocid="admin.suspended">
                  <Badge
                    variant="secondary"
                    className="mr-auto border border-border md:mr-3"
                  >
                    {ROLE_LABEL[user.role]}
                  </Badge>
                  {canAct && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      data-ocid={`admin.suspended.reinstate_button.${n}`}
                      disabled={busy}
                      onClick={() =>
                        run(
                          (o) => reinstate.mutate(user.principal, o),
                          `${user.fullName} has been reinstated.`,
                        )
                      }
                    >
                      {reinstate.isPending &&
                      reinstate.variables?.toString() === id ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <RotateCcw />
                      )}
                      Reinstate
                    </Button>
                  )}
                </UserRow>
              );
            })}
          </ul>
        )}
      </SectionShell>
    </div>
  );
}
