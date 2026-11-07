import { VaultLogo } from "@/components/VaultLogo";
import { branding } from "@/lib/config";
import { cn } from "@/lib/utils";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

export type NavKey = "directory" | "about" | "admin";

interface HeaderProps {
  active: NavKey;
  onNavigate: (key: NavKey) => void;
  isAuthenticated: boolean;
  displayName?: string;
  /** Show the Admin nav item (approved admins only). */
  showAdmin?: boolean;
  /** Hide all navigation, leaving only sign-out. */
  hideNav?: boolean;
  onSignOut: () => void;
}

const BASE_NAV_ITEMS: { key: NavKey; label: string }[] = [
  { key: "directory", label: "Directory" },
  { key: "about", label: "About" },
];
const ADMIN_NAV_ITEM: { key: NavKey; label: string } = {
  key: "admin",
  label: "Admin",
};

export function Header({
  active,
  onNavigate,
  isAuthenticated,
  displayName,
  showAdmin = false,
  hideNav = false,
  onSignOut,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const NAV_ITEMS = hideNav
    ? []
    : showAdmin
      ? [...BASE_NAV_ITEMS, ADMIN_NAV_ITEM]
      : BASE_NAV_ITEMS;

  const handleNavigate = (key: NavKey) => {
    onNavigate(key);
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-primary text-primary-foreground shadow-masthead">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 md:px-6">
        <button
          type="button"
          data-ocid="header.home_link"
          onClick={() => handleNavigate("directory")}
          className="flex min-w-0 items-center gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <VaultLogo
            size={36}
            title={`${branding.organizationName} emblem`}
            className="rounded-full bg-primary-foreground/10 p-0.5"
          />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-display text-sm font-semibold tracking-tight md:text-base">
              {branding.organizationName}
            </span>
            <span className="truncate text-[11px] uppercase tracking-widest text-primary-foreground/70">
              {branding.tagline}
            </span>
          </span>
        </button>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              data-ocid={`nav.${item.key}.link`}
              onClick={() => handleNavigate(item.key)}
              aria-current={active === item.key ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-smooth outline-none focus-visible:ring-2 focus-visible:ring-accent",
                active === item.key
                  ? "bg-primary-foreground/15 text-primary-foreground"
                  : "text-primary-foreground/75 hover:bg-primary-foreground/10 hover:text-primary-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
          {isAuthenticated ? (
            <div className="ml-2 flex items-center gap-2 border-l border-primary-foreground/20 pl-3">
              <span
                data-ocid="header.user_chip"
                className="max-w-[10rem] truncate text-sm text-primary-foreground/85"
                title={displayName}
              >
                {displayName ?? "Signed in"}
              </span>
              <button
                type="button"
                data-ocid="header.sign_out_button"
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-medium text-primary-foreground/80 transition-smooth hover:bg-primary-foreground/10 hover:text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <LogOut className="size-4" aria-hidden="true" />
                Sign out
              </button>
            </div>
          ) : null}
        </nav>

        <button
          type="button"
          data-ocid="header.menu_toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label={
            menuOpen ? "Close navigation menu" : "Open navigation menu"
          }
          className="inline-flex size-10 items-center justify-center rounded-md text-primary-foreground transition-smooth hover:bg-primary-foreground/10 outline-none focus-visible:ring-2 focus-visible:ring-accent md:hidden"
        >
          {menuOpen ? (
            <X className="size-5" aria-hidden="true" />
          ) : (
            <Menu className="size-5" aria-hidden="true" />
          )}
        </button>
      </div>

      <div className="rule-gold h-0.5 w-full" aria-hidden="true" />

      {menuOpen ? (
        <div className="border-t border-primary-foreground/15 bg-primary md:hidden">
          <nav
            className="mx-auto flex max-w-5xl flex-col px-4 py-2"
            aria-label="Primary mobile"
          >
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                data-ocid={`nav.mobile.${item.key}.link`}
                onClick={() => handleNavigate(item.key)}
                aria-current={active === item.key ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-3 text-left text-sm font-medium transition-smooth",
                  active === item.key
                    ? "bg-primary-foreground/15 text-primary-foreground"
                    : "text-primary-foreground/80 hover:bg-primary-foreground/10",
                )}
              >
                {item.label}
              </button>
            ))}
            {isAuthenticated ? (
              <button
                type="button"
                data-ocid="header.mobile.sign_out_button"
                onClick={() => {
                  setMenuOpen(false);
                  onSignOut();
                }}
                className="mt-1 inline-flex items-center gap-2 rounded-md px-3 py-3 text-left text-sm font-medium text-primary-foreground/80 transition-smooth hover:bg-primary-foreground/10"
              >
                <LogOut className="size-4" aria-hidden="true" />
                Sign out
              </button>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
