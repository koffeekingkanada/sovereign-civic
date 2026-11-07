import { Button } from "@/components/ui/button";
import { branding } from "@/lib/config";
import { SOVEREIGNTY_FRAMING } from "@/pages/LoginPage";
import { ArrowLeft } from "lucide-react";

const PRINCIPLES = [
  {
    title: "Independent infrastructure",
    body: "Records and messages are held on the Internet Computer, operated by independent node providers rather than a single cloud company. Hosting on nodes located in Canada is on the development roadmap.",
  },
  {
    title: "Identity you can trust",
    body: "Every account is anchored to Internet Identity, giving each staff member a verifiable, self-custodied credential.",
  },
  {
    title: "Built for public service",
    body: "The interface follows a restrained institutional register — legible, accessible, and free of decoration that does not serve the work.",
  },
];

export function AboutPage({ onBackToLogin }: { onBackToLogin?: () => void }) {
  return (
    <div className="relative isolate overflow-hidden">
      <div className="relative mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-14">
        {onBackToLogin ? (
          <Button
            type="button"
            variant="ghost"
            data-ocid="about.back_to_login_button"
            onClick={onBackToLogin}
            className="mb-6 -ml-2 rounded-md"
          >
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Back to sign in
          </Button>
        ) : null}
        <div className="animate-fade-in-up max-w-2xl space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            About this service
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {branding.organizationName}
          </h1>
          <div className="rule-gold h-0.5 w-24" aria-hidden="true" />
          <p className="text-base text-muted-foreground">
            Sovereign Civic Systems is a proof-of-concept directory and direct
            messaging service for an organization's staff. This demonstration is
            configured for a sample organization.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PRINCIPLES.map((item) => (
            <section
              key={item.title}
              className="animate-fade-in-up rounded-lg border border-border bg-card p-5 shadow-card-resting transition-smooth hover:shadow-card-hover"
            >
              <h2 className="font-display text-base font-semibold text-foreground">
                {item.title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
            </section>
          ))}
        </div>

        <section
          data-ocid="about.framing_panel"
          className="surface-sunken mt-10 rounded-lg border border-border p-6 md:p-8"
        >
          <h2 className="font-display text-lg font-semibold text-foreground">
            Sovereignty and scope
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {SOVEREIGNTY_FRAMING}
          </p>
          <p className="mt-4 max-w-3xl text-sm text-muted-foreground">
            This service is a proof of concept for sovereign internal
            communication. Group conversations and read receipts are not yet
            available. Do not use this service for information classified above
            the level approved for your account.
          </p>
        </section>
      </div>
    </div>
  );
}
