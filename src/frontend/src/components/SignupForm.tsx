import type { Profile } from "@/backend";
import { VaultLogo } from "@/components/VaultLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateProfile } from "@/hooks/useProfile";
import { branding } from "@/lib/config";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";

interface SignupFormProps {
  profile: Profile;
  onDone?: () => void;
  onCancel?: () => void;
}

type FieldKey = "fullName" | "workEmail" | "department" | "jobTitle";

const FIELDS: ReadonlyArray<{
  key: FieldKey;
  label: string;
  autoComplete: string;
  type: string;
  placeholder: string;
}> = [
  {
    key: "fullName",
    label: "Full name",
    autoComplete: "name",
    type: "text",
    placeholder: "e.g. Jordan Whitfield",
  },
  {
    key: "workEmail",
    label: "Work email",
    autoComplete: "email",
    type: "email",
    placeholder: "name@yourorganization.com",
  },
  {
    key: "department",
    label: "Department or team",
    autoComplete: "organization",
    type: "text",
    placeholder: "e.g. Finance",
  },
  {
    key: "jobTitle",
    label: "Job title",
    autoComplete: "organization-title",
    type: "text",
    placeholder: "e.g. Policy Analyst",
  },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(key: FieldKey, raw: string): string | null {
  const value = raw.trim();
  if (value.length === 0) return "This field is required.";
  if (key === "fullName" && value.length < 2) {
    return "Enter at least 2 characters.";
  }
  if (key === "workEmail" && !EMAIL_PATTERN.test(value)) {
    return "Enter a valid email address, such as name@yourorganization.com.";
  }
  return null;
}

/**
 * The signed-in user's own details form. Access is invitation-only, so this is
 * only ever used to update an existing profile — there is no public sign-up
 * path.
 */
export function SignupForm({ profile, onDone, onCancel }: SignupFormProps) {
  const [values, setValues] = useState<Record<FieldKey, string>>({
    fullName: profile.fullName,
    workEmail: profile.workEmail,
    department: profile.department,
    jobTitle: profile.jobTitle,
  });
  const [touched, setTouched] = useState<Record<FieldKey, boolean>>({
    fullName: false,
    workEmail: false,
    department: false,
    jobTitle: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const update = useUpdateProfile();

  const errors: Record<FieldKey, string | null> = {
    fullName: validate("fullName", values.fullName),
    workEmail: validate("workEmail", values.workEmail),
    department: validate("department", values.department),
    jobTitle: validate("jobTitle", values.jobTitle),
  };
  const valid = Object.values(errors).every((e) => e === null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (update.isPending) return;
    setSubmitted(true);
    if (!valid) {
      setTouched({
        fullName: true,
        workEmail: true,
        department: true,
        jobTitle: true,
      });
      return;
    }
    update.mutate(
      {
        fullName: values.fullName.trim(),
        workEmail: values.workEmail.trim(),
        department: values.department.trim(),
        jobTitle: values.jobTitle.trim(),
      },
      { onSuccess: () => onDone?.() },
    );
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-8 md:py-12">
      <div
        data-ocid="signup.panel"
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
              Update your details
            </h1>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Keep your details current so colleagues can find you in the directory.
        </p>
        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          {FIELDS.map((field) => {
            const showError =
              (touched[field.key] || submitted) && errors[field.key];
            const errorId = `signup-${field.key}-error`;
            return (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={`signup-${field.key}`}>{field.label}</Label>
                <Input
                  id={`signup-${field.key}`}
                  data-ocid={`signup.${field.key}.input`}
                  type={field.type}
                  value={values[field.key]}
                  placeholder={field.placeholder}
                  autoComplete={field.autoComplete}
                  maxLength={120}
                  aria-invalid={showError ? true : undefined}
                  aria-describedby={showError ? errorId : undefined}
                  onBlur={() =>
                    setTouched((prev) => ({ ...prev, [field.key]: true }))
                  }
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      [field.key]: event.target.value,
                    }))
                  }
                />
                {showError ? (
                  <p
                    id={errorId}
                    data-ocid={`signup.${field.key}.field_error`}
                    className="text-xs text-destructive"
                  >
                    {errors[field.key]}
                  </p>
                ) : null}
              </div>
            );
          })}
          {update.isError ? (
            <p
              data-ocid="signup.error_state"
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              We could not save your details. Please try again.
            </p>
          ) : null}
          {update.isSuccess ? (
            <output
              data-ocid="signup.success_state"
              className="flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              Your details have been saved.
            </output>
          ) : null}
          <Button
            type="submit"
            data-ocid="signup.submit_button"
            disabled={update.isPending}
            className="w-full rounded-md"
          >
            {update.isPending ? "Saving…" : "Save details"}
          </Button>
          {onCancel ? (
            <Button
              type="button"
              variant="ghost"
              data-ocid="signup.cancel_button"
              onClick={onCancel}
              disabled={update.isPending}
              className="w-full rounded-md"
            >
              Cancel
            </Button>
          ) : null}
        </form>
      </div>
    </div>
  );
}
