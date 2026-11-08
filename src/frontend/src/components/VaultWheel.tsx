import { VaultLogo } from "@/components/VaultLogo";
import { cn } from "@/lib/utils";

interface WheelNode {
  /** Short label rendered inside the circle. */
  label: string;
  /** Roadmap items are drawn faded to signal they are not yet available. */
  roadmap?: boolean;
}

/**
 * The five capabilities that are live today, followed by the five roadmap
 * items. Order is fixed so the ring reads clockwise from the top.
 */
const WHEEL_NODES: WheelNode[] = [
  { label: "Directory" },
  { label: "Private Messaging" },
  { label: "Admin Approval" },
  { label: "Internet Identity" },
  { label: "Independent Nodes" },
  { label: "Encryption", roadmap: true },
  { label: "Canadian Hosting", roadmap: true },
  { label: "File Sharing", roadmap: true },
  { label: "Documents", roadmap: true },
  { label: "Email", roadmap: true },
];

interface VaultWheelProps {
  /** Additional classes applied to the positioning wrapper. */
  className?: string;
  /**
   * When true the ring nodes and connecting lines play their staggered
   * pop-out entrance. The caller is responsible for honouring reduced motion
   * by leaving this false.
   */
  animate?: boolean;
  /** Accessible label describing the wheel. */
  title?: string;
}

/**
 * Vault wheel: the SCS badge at the centre with labelled capability circles
 * arranged in a ring around it, each joined to the centre by a spoke. Live
 * capabilities are solid; roadmap items are faded. A key beneath the ring
 * explains the two states. Purely presentational apart from the optional
 * accessible label.
 */
export function VaultWheel({
  className,
  animate = false,
  title = "Capabilities of the service",
}: VaultWheelProps) {
  const count = WHEEL_NODES.length;
  const radius = 40; // percentage of the half-size
  const centre = 50;

  return (
    <div className={cn("w-full", className)}>
      <div
        className="relative aspect-square w-full"
        role="img"
        aria-label={title}
      >
        {/* Spokes from the centre to each node. */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
          preserveAspectRatio="xMidYMid meet"
        >
          {WHEEL_NODES.map((node, index) => {
            const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
            const x = centre + Math.cos(angle) * radius;
            const y = centre + Math.sin(angle) * radius;
            return (
              <line
                key={node.label}
                x1={centre}
                y1={centre}
                x2={x}
                y2={y}
                stroke="var(--border)"
                strokeWidth="0.6"
                className={cn(
                  animate && "wheel-spoke motion-safe:animate-wheel-spoke",
                )}
                style={
                  animate
                    ? { animationDelay: `${0.35 + index * 0.06}s` }
                    : undefined
                }
              />
            );
          })}
        </svg>

        {/* Centre badge. */}
        <div
          className={cn(
            "absolute left-1/2 top-1/2 flex size-[24%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card shadow-card-resting",
            animate && "wheel-centre motion-safe:animate-wheel-centre",
          )}
        >
          <VaultLogo size={64} className="h-[78%] w-[78%]" />
        </div>

        {/* Labelled capability circles. */}
        {WHEEL_NODES.map((node, index) => {
          const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
          const x = centre + Math.cos(angle) * radius;
          const y = centre + Math.sin(angle) * radius;
          return (
            <div
              key={node.label}
              className={cn(
                "absolute flex size-[30.6%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border p-1.5 text-center text-[0.6rem] font-medium leading-tight sm:text-[0.7rem]",
                node.roadmap
                  ? "border-dashed border-border bg-background/70 text-muted-foreground/70"
                  : "border-primary/40 bg-card text-foreground shadow-card-resting",
                animate && "wheel-node motion-safe:animate-wheel-node",
              )}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                ...(animate
                  ? { animationDelay: `${0.35 + index * 0.06}s` }
                  : {}),
              }}
            >
              <span className="line-clamp-3 break-words">{node.label}</span>
            </div>
          );
        })}
      </div>

      {/* Key explaining the solid and faded states. */}
      <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-3 shrink-0 rounded-full border border-primary/40 bg-card"
          />
          Available now
        </li>
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-3 shrink-0 rounded-full border border-dashed border-border bg-background/70"
          />
          Roadmap
        </li>
      </ul>
    </div>
  );
}
