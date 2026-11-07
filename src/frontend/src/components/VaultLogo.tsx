import { cn } from "@/lib/utils";

interface VaultLogoProps {
  /** Rendered size in pixels for both width and height. Defaults to 40. */
  size?: number;
  /** Additional classes applied to the SVG element. */
  className?: string;
  /** Accessible label. When omitted the SVG is treated as decorative. */
  title?: string;
}

/**
 * Flat, round institutional badge: a navy disc with a gold ring and the
 * monogram "SCS" set in gold. Drawn as inline SVG so it stays crisp at small
 * sizes and follows the app's navy and gold theme colours through the
 * `--primary` and `--accent` CSS custom properties.
 */
export function VaultLogo({ size = 40, className, title }: VaultLogoProps) {
  const labelled = Boolean(title);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={labelled ? "img" : undefined}
      aria-hidden={labelled ? undefined : true}
      aria-label={labelled ? title : undefined}
      className={cn("shrink-0", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {labelled ? <title>{title}</title> : null}

      {/* Navy disc */}
      <circle cx="32" cy="32" r="31" fill="oklch(var(--primary))" />
      {/* Gold outer ring */}
      <circle
        cx="32"
        cy="32"
        r="27.5"
        stroke="oklch(var(--accent))"
        strokeWidth="2.5"
      />
      {/* Monogram */}
      <text
        x="32"
        y="32"
        textAnchor="middle"
        dominantBaseline="central"
        fill="oklch(var(--accent))"
        fontFamily="var(--font-display), sans-serif"
        fontSize="21"
        fontWeight="700"
        letterSpacing="0.5"
      >
        SCS
      </text>
    </svg>
  );
}
