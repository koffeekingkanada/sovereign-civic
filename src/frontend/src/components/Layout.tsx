import { branding } from "@/lib/config";
import type { ReactNode } from "react";

/**
 * Build metadata shown in the shared footer.
 *
 * A future build only has to increment BUILD_VERSION by one to match Caffeine's
 * version number and update BUILD_TIMESTAMP to the moment the build was made.
 */
export const BUILD_VERSION = "v22";

/** Moment this build was made, as a UTC ISO 8601 string. */
export const BUILD_TIMESTAMP = "2026-11-07T14:20:00Z";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Format the build timestamp deterministically as "Nov 7, 2026 10:40". */
function formatBuildTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const month = MONTHS[date.getUTCMonth()];
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${month} ${day}, ${year} ${hours}:${minutes}`;
}

/** "Preview" on a draft web address, "Live" otherwise. */
function buildEnvironment(): string {
  if (typeof window === "undefined" || !window.location) return "Live";
  const hostname = window.location.hostname ?? "";
  const href = window.location.href ?? "";
  return /-draft/i.test(hostname) || /-draft/i.test(href) ? "Preview" : "Live";
}

interface LayoutProps {
  children: ReactNode;
  header: ReactNode;
}

export function Layout({ children, header }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {header}
      <main className="flex-1">{children}</main>
      <footer className="surface-sunken border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="space-y-1">
            <p className="font-display text-sm font-semibold text-foreground">
              {branding.organizationName}
            </p>
            <p className="text-xs text-muted-foreground">{branding.tagline}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Powered by the Internet Computer
          </p>
          <p className="text-xs text-muted-foreground">
            {`Build ${BUILD_VERSION} · ${buildEnvironment()} · ${formatBuildTimestamp(BUILD_TIMESTAMP)}`}
          </p>
        </div>
      </footer>
    </div>
  );
}
