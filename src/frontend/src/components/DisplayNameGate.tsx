import { VaultLogo } from "@/components/VaultLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegisterProfile } from "@/hooks/useProfile";
import { branding } from "@/lib/config";
import { useState } from "react";

interface DisplayNameGateProps {
  /** Called after the profile is successfully persisted. */
  onComplete: () => void;
  /** Pre-fill for an existing user editing their name. */
  initialName?: string;
  /** When true, the user already has a profile and is editing it. */
  isEditing?: boolean;
}

/**
 * Blocks access to the app until the signed-in user has set a display name.
 * Also used from the profile surface to update an existing display name.
 */
export function DisplayNameGate({
  onComplete,
  initialName = "",
  isEditing = false,
}: DisplayNameGateProps) {
  const [name, setName] = useState(initialName);
  const registerProfile = useRegisterProfile();

  const trimmed = name.trim();
  const canSubmit = trimmed.length >= 2 && !registerProfile.isPending;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    registerProfile.mutate(
      { fullName: trimmed, workEmail: "", department: "", jobTitle: "" },
      {
        onSuccess: () => onComplete(),
      },
    );
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-12">
      <div className="animate-fade-in-up rounded-lg border border-border bg-card p-6 shadow-card-resting md:p-8">
        <div className="mb-6 flex items-center gap-3">
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
              {isEditing ? "Update your display name" : "Set your display name"}
            </h1>
          </div>
        </div>

        <p className="mb-6 text-sm text-muted-foreground">
          {isEditing
            ? "Your display name is how colleagues in the directory will identify you."
            : "Before you can use the directory, choose the name that will appear to other registered users."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display-name">Display name</Label>
            <Input
              id="display-name"
              data-ocid="profile.display_name_input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Jordan Whitfield"
              autoComplete="name"
              maxLength={60}
              aria-invalid={registerProfile.isError}
              aria-describedby="display-name-help"
            />
            <p id="display-name-help" className="text-xs text-muted-foreground">
              At least 2 characters. Visible to other registered users.
            </p>
          </div>

          {registerProfile.isError ? (
            <p
              data-ocid="profile.error_state"
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              We could not save your display name. Please try again.
            </p>
          ) : null}

          <Button
            type="submit"
            data-ocid="profile.submit_button"
            disabled={!canSubmit}
            className="w-full rounded-md"
          >
            {registerProfile.isPending
              ? "Saving…"
              : isEditing
                ? "Save changes"
                : "Continue to directory"}
          </Button>
        </form>
      </div>
    </div>
  );
}
