import { branding } from "@/lib/config";
import type { ReactNode } from "react";

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
        </div>
      </footer>
    </div>
  );
}
