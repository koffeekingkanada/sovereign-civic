import { cn } from "@/lib/utils";

interface DemoBadgeProps {
  className?: string;
}

/** Small marker shown beside the name of a demo account. */
export function DemoBadge({ className }: DemoBadgeProps) {
  return (
    <span
      data-ocid="demo.badge"
      title="Demo account"
      className={cn(
        "inline-flex shrink-0 items-center rounded-sm border border-accent bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wider text-foreground",
        className,
      )}
    >
      Demo
    </span>
  );
}
