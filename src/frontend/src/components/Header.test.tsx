import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Header } from "@/components/Header";
import { branding } from "@/lib/config";

/**
 * Characterization baseline for Header behavior the branding change must not
 * break. The accepted change replaces the emblem image and removes the
 * province identity line from the masthead; the navigation, the active-item
 * marking, the sign-out control and the mobile menu are adjacent behavior that
 * must survive that edit.
 *
 * Deliberately NOT frozen here: the emblem's alt text, its src, and the
 * province identity line — the accepted request intentionally changes all
 * three.
 */

function renderHeader(
  overrides: Partial<React.ComponentProps<typeof Header>> = {},
) {
  const onNavigate = vi.fn();
  const onSignOut = vi.fn();
  const utils = render(
    <Header
      active="directory"
      onNavigate={onNavigate}
      isAuthenticated={false}
      onSignOut={onSignOut}
      {...overrides}
    />,
  );
  return { ...utils, onNavigate, onSignOut };
}

describe("Header branding", () => {
  it("shows the Demo Organization name and the vault-door emblem", () => {
    renderHeader();

    expect(screen.getByText("Demo Organization")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: `${branding.organizationName} emblem` }),
    ).toBeInTheDocument();
    // The retired image asset is gone; the emblem is the original SVG logo.
    expect(
      screen.queryByAltText(`${branding.organizationName} emblem`),
    ).not.toBeInTheDocument();
  });

  it("uses no province or government wording in the masthead", () => {
    const { container } = renderHeader();
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/province|provincial|Alberta|government/i);
  });
});

describe("Header navigation", () => {
  it("offers Directory and About, and reports the active item", () => {
    renderHeader({ active: "about" });

    const nav = screen.getByRole("navigation", { name: /^Primary$/ });
    const about = within(nav).getByRole("button", { name: /^About$/ });
    const directory = within(nav).getByRole("button", { name: /^Directory$/ });

    expect(about).toHaveAttribute("aria-current", "page");
    expect(directory).not.toHaveAttribute("aria-current");
  });

  it("calls onNavigate with the chosen key", async () => {
    const user = userEvent.setup();
    const { onNavigate } = renderHeader();

    await user.click(screen.getByRole("button", { name: /^About$/ }));

    expect(onNavigate).toHaveBeenCalledWith("about");
  });

  it("shows the Admin item only when showAdmin is set", () => {
    const { unmount } = renderHeader();
    expect(
      screen.queryByRole("button", { name: /^Admin$/ }),
    ).not.toBeInTheDocument();
    unmount();

    renderHeader({ showAdmin: true });
    expect(screen.getByRole("button", { name: /^Admin$/ })).toBeInTheDocument();
  });

  it("hides all navigation when hideNav is set", () => {
    renderHeader({ hideNav: true });

    expect(
      screen.queryByRole("button", { name: /^(Directory|About|Admin)$/ }),
    ).not.toBeInTheDocument();
  });
});

describe("Header sign-out", () => {
  it("shows the signed-in user's name and signs out on click", async () => {
    const user = userEvent.setup();
    const { onSignOut } = renderHeader({
      isAuthenticated: true,
      displayName: "Ada Lovelace",
    });

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /sign out/i }));

    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it("offers no sign-out control to a signed-out visitor", () => {
    renderHeader({ isAuthenticated: false });

    expect(
      screen.queryByRole("button", { name: /sign out/i }),
    ).not.toBeInTheDocument();
  });
});

describe("Header mobile menu", () => {
  it("toggles the mobile navigation open and closed", async () => {
    const user = userEvent.setup();
    renderHeader();

    const toggle = screen.getByRole("button", {
      name: /open navigation menu/i,
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);

    const mobileNav = screen.getByRole("navigation", {
      name: /^Primary mobile$/,
    });
    expect(
      within(mobileNav).getByRole("button", { name: /^About$/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /close navigation menu/i }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("closes the mobile menu after navigating", async () => {
    const user = userEvent.setup();
    const { onNavigate } = renderHeader();

    await user.click(
      screen.getByRole("button", { name: /open navigation menu/i }),
    );
    const mobileNav = screen.getByRole("navigation", {
      name: /^Primary mobile$/,
    });
    await user.click(
      within(mobileNav).getByRole("button", { name: /^About$/ }),
    );

    expect(onNavigate).toHaveBeenCalledWith("about");
    expect(
      screen.queryByRole("navigation", { name: /^Primary mobile$/ }),
    ).not.toBeInTheDocument();
  });
});
