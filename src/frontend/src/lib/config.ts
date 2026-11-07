/**
 * White-label branding configuration.
 *
 * This is the single reskin surface for the application. To rebrand for another
 * organization, edit only the values below — every page and shared layout reads
 * its organization name, colors, and logo from here.
 */
export interface BrandingConfig {
  /** Name of the organization operating the service. */
  organizationName: string;
  /** Primary brand color as a hex string. Drives masthead, buttons, links. */
  primaryColor: string;
  /** Accent color as a hex string. Used for hairline rules and focus marks. */
  accentColor: string;
  /** Path to the logo asset served from the frontend public directory. */
  logoPath: string;
  /** Short tagline shown on the login page. */
  tagline: string;
}

export const branding: BrandingConfig = {
  organizationName: "Demo Organization",
  primaryColor: "#1e3a5f",
  accentColor: "#c8a04e",
  logoPath: "/logo.png",
  tagline: "Sovereign communication infrastructure.",
};
