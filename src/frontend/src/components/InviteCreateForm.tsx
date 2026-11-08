import { Role } from "@/backend";
import type { Invite } from "@/backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateInvite } from "@/hooks/useAdmin";
import { cn } from "@/lib/utils";
import {
  Check,
  Copy,
  KeyRound,
  Link2,
  ShieldAlert,
  UserPlus,
} from "lucide-react";
import { useState } from "react";

interface InviteCreateFormProps {
  /** The signed-in admin's own department, used to lock the field for a Department Admin. */
  department: string;
  /** True for a Super Admin, who may invite into any department. */
  isSuper: boolean;
}

type FieldKey = "fullName" | "workEmail" | "phone" | "department";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_OPTIONS: ReadonlyArray<{ value: Role; label: string }> = [
  { value: Role.member, label: "Member" },
  { value: Role.departmentAdmin, label: "Department Admin" },
  { value: Role.superAdmin, label: "Super Admin" },
];

/**
 * The roles an administrator may grant. Only a Super Admin may grant the
 * Super Admin role; a Department Admin is limited to Member and Department
 * Admin, matching the backend's invite rules.
 */
function grantableRoles(isSuper: boolean): ReadonlyArray<{
  value: Role;
  label: string;
}> {
  return isSuper
    ? ROLE_OPTIONS
    : ROLE_OPTIONS.filter((option) => option.value !== Role.superAdmin);
}

function validate(key: FieldKey, raw: string): string | null {
  const value = raw.trim();
  if (value.length === 0) return "This field is required.";
  if (key === "fullName" && value.length < 2) {
    return "Enter at least 2 characters.";
  }
  if (key === "workEmail" && !EMAIL_PATTERN.test(value)) {
    return "Enter a valid email address, such as name@yourorganization.com.";
  }
  if (key === "phone" && value.replace(/\D/g, "").length < 7) {
    return "Enter a valid phone number.";
  }
  return null;
}

/** The invite link an administrator sends by email: the app address plus the token. */
function inviteLink(linkToken: string): string {
  if (typeof window === "undefined" || !window.location) return linkToken;
  const { origin, pathname } = window.location;
  return `${origin}${pathname}?invite=${encodeURIComponent(linkToken)}`;
}

function CopyField({
  ocid,
  label,
  value,
  mono,
}: {
  ocid: string;
  label: string;
  value: string;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={`${ocid}-value`}>{label}</Label>
      <div className="flex items-stretch gap-2">
        <Input
          id={`${ocid}-value`}
          data-ocid={`${ocid}.value`}
          readOnly
          value={value}
          onFocus={(event) => event.currentTarget.select()}
          className={cn("min-w-0 flex-1", mono && "font-mono tracking-widest")}
        />
        <Button
          type="button"
          variant="outline"
          data-ocid={`${ocid}.copy_button`}
          onClick={() => void copy()}
          aria-label={`Copy ${label.toLowerCase()}`}
        >
          {copied ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

/**
 * The administrator's invite form. A Department Admin may only invite into
 * their own department; a Super Admin may choose any department. On success the
 * single-use link and the separate 6-digit code are shown so the administrator
 * can send the link by email and the code by text or phone.
 */
export function InviteCreateForm({
  department,
  isSuper,
}: InviteCreateFormProps) {
  const [values, setValues] = useState<Record<FieldKey, string>>({
    fullName: "",
    workEmail: "",
    phone: "",
    department: isSuper ? "" : department,
  });
  const [role, setRole] = useState<Role>(Role.member);
  const [touched, setTouched] = useState<Record<FieldKey, boolean>>({
    fullName: false,
    workEmail: false,
    phone: false,
    department: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [created, setCreated] = useState<Invite | null>(null);
  const create = useCreateInvite();
  const roleOptions = grantableRoles(isSuper);

  const errors: Record<FieldKey, string | null> = {
    fullName: validate("fullName", values.fullName),
    workEmail: validate("workEmail", values.workEmail),
    phone: validate("phone", values.phone),
    department: validate("department", values.department),
  };
  const valid = Object.values(errors).every((e) => e === null);

  const setField = (key: FieldKey, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (create.isPending) return;
    setSubmitted(true);
    if (!valid) {
      setTouched({
        fullName: true,
        workEmail: true,
        phone: true,
        department: true,
      });
      return;
    }
    const input = {
      fullName: values.fullName.trim(),
      workEmail: values.workEmail.trim(),
      phone: values.phone.trim(),
      department: values.department.trim(),
      role,
    };
    create.mutate(input, {
      onSuccess: (invite) => {
        setCreated(invite);
        setValues({
          fullName: "",
          workEmail: "",
          phone: "",
          department: isSuper ? "" : department,
        });
        setRole(Role.member);
        setTouched({
          fullName: false,
          workEmail: false,
          phone: false,
          department: false,
        });
        setSubmitted(false);
      },
    });
  };

  const fields: ReadonlyArray<{
    key: FieldKey;
    label: string;
    type: string;
    autoComplete: string;
    placeholder: string;
    locked: boolean;
  }> = [
    {
      key: "fullName",
      label: "Full name",
      type: "text",
      autoComplete: "name",
      placeholder: "e.g. Jordan Whitfield",
      locked: false,
    },
    {
      key: "workEmail",
      label: "Work email",
      type: "email",
      autoComplete: "email",
      placeholder: "name@yourorganization.com",
      locked: false,
    },
    {
      key: "phone",
      label: "Phone number",
      type: "tel",
      autoComplete: "tel",
      placeholder: "e.g. +1 555 010 4477",
      locked: false,
    },
    {
      key: "department",
      label: "Department",
      type: "text",
      autoComplete: "organization",
      placeholder: "e.g. Finance",
      locked: !isSuper,
    },
  ];

  return (
    <div className="space-y-5 p-4 md:p-5">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((field) => {
            const showError =
              (touched[field.key] || submitted) && errors[field.key];
            const errorId = `invite-${field.key}-error`;
            return (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={`invite-${field.key}`}>{field.label}</Label>
                <Input
                  id={`invite-${field.key}`}
                  data-ocid={`admin.invite.${field.key}.input`}
                  type={field.type}
                  value={values[field.key]}
                  placeholder={field.placeholder}
                  autoComplete={field.autoComplete}
                  maxLength={120}
                  readOnly={field.locked}
                  aria-readonly={field.locked || undefined}
                  aria-invalid={showError ? true : undefined}
                  aria-describedby={showError ? errorId : undefined}
                  onBlur={() =>
                    setTouched((prev) => ({ ...prev, [field.key]: true }))
                  }
                  onChange={(event) => setField(field.key, event.target.value)}
                  className={cn(
                    field.locked && "bg-muted text-muted-foreground",
                  )}
                />
                {field.locked ? (
                  <p className="text-xs text-muted-foreground">
                    Locked to your department.
                  </p>
                ) : null}
                {showError ? (
                  <p
                    id={errorId}
                    data-ocid={`admin.invite.${field.key}.field_error`}
                    className="text-xs text-destructive"
                  >
                    {errors[field.key]}
                  </p>
                ) : null}
              </div>
            );
          })}
          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <select
              id="invite-role"
              data-ocid="admin.invite.role.select"
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {create.isError ? (
          <p
            data-ocid="admin.invite.error_state"
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            <ShieldAlert
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <span className="min-w-0 break-words">
              {create.error instanceof Error && create.error.message
                ? create.error.message
                : "The invite could not be created. Please try again."}
            </span>
          </p>
        ) : null}

        <Button
          type="submit"
          data-ocid="admin.invite.create_button"
          disabled={create.isPending}
          className="rounded-md"
        >
          <UserPlus className="size-4" aria-hidden="true" />
          {create.isPending ? "Creating invite…" : "Create invite"}
        </Button>
      </form>

      {created ? (
        <div
          data-ocid="admin.invite.created_panel"
          className="space-y-4 rounded-md border border-border bg-secondary p-4"
        >
          <div className="flex items-start gap-2">
            <KeyRound
              className="mt-0.5 size-4 shrink-0 text-foreground"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="font-medium text-foreground">
                Invite ready for {created.fullName}
              </p>
              <p className="text-sm text-muted-foreground">
                Send the link by email and the code separately by text or phone.
                Each works once and expires in 7 days.
              </p>
            </div>
          </div>

          <CopyField
            ocid="admin.invite.link"
            label="Invite link (send by email)"
            value={inviteLink(created.linkToken)}
          />
          <CopyField
            ocid="admin.invite.code"
            label="6-digit code (send by text or phone)"
            value={created.code}
            mono
          />

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link2 className="size-3.5 shrink-0" aria-hidden="true" />
            <span>
              {created.department} ·{" "}
              {ROLE_OPTIONS.find((o) => o.value === created.role)?.label ??
                created.role}
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            data-ocid="admin.invite.done_button"
            onClick={() => setCreated(null)}
            className="rounded-md"
          >
            Done
          </Button>
        </div>
      ) : null}
    </div>
  );
}
