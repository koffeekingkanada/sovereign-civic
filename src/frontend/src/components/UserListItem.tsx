import type { DirectoryEntry } from "@/backend";
import { DemoBadge } from "@/components/DemoBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";

/** Two-letter monogram derived from a display name. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Shorten a principal to its first and last few characters so long
 * identifiers never force a row wider than the viewport.
 */
export function shortenPrincipal(principal: string): string {
  const text = principal.trim();
  if (text.length <= 13) return text;
  return `${text.slice(0, 5)}…${text.slice(-5)}`;
}

interface UserListItemProps {
  entry: DirectoryEntry;
  /** 1-based position in the rendered list, used for deterministic markers. */
  index: number;
  /** True when this entry belongs to the signed-in user. */
  isSelf: boolean;
  /** True when this entry is the currently open conversation. */
  selected: boolean;
  onMessage: () => void;
}

/**
 * A single directory row. The signed-in user's own entry is visually
 * distinguished and cannot be messaged; every other entry exposes a
 * "Message" action that opens the 1-to-1 conversation. Tapping anywhere on
 * the row opens the same conversation.
 */
export function UserListItem({
  entry,
  index,
  isSelf,
  selected,
  onMessage,
}: UserListItemProps) {
  const principalText = entry.principal.toText();

  const rowClassName = cn(
    "flex w-full items-center gap-3 rounded-md border px-3 py-3 text-left transition-smooth",
    selected
      ? "border-primary/40 bg-secondary"
      : "border-transparent hover:border-border hover:bg-secondary/60",
    isSelf && "border-dashed border-border bg-muted/40",
  );

  const content = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-sm font-display text-xs font-semibold",
          isSelf
            ? "bg-secondary text-secondary-foreground"
            : "bg-primary text-primary-foreground",
        )}
      >
        {initials(entry.displayName)}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="break-words text-sm font-medium text-foreground sm:truncate">
            {entry.displayName}
          </span>
          {entry.isDemo ? <DemoBadge /> : null}
          {isSelf ? (
            <span className="shrink-0 rounded-sm border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              You
            </span>
          ) : null}
        </span>
        <span
          className="block truncate font-mono text-[11px] text-muted-foreground"
          title={principalText}
        >
          {shortenPrincipal(principalText)}
        </span>
      </span>

      {isSelf ? (
        <span className="shrink-0 text-xs text-muted-foreground">
          This is you
        </span>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-ocid={`directory.message_button.${index + 1}`}
          onClick={(event) => {
            event.stopPropagation();
            onMessage();
          }}
          className="shrink-0 rounded-md"
        >
          <MessageSquare className="size-4" aria-hidden="true" />
          Message
        </Button>
      )}
    </>
  );

  if (isSelf) {
    return (
      <div
        data-ocid={`directory.item.${index + 1}`}
        aria-current={selected ? "true" : undefined}
        className={rowClassName}
      >
        {content}
      </div>
    );
  }

  return (
    <div
      data-ocid={`directory.item.${index + 1}`}
      aria-current={selected ? "true" : undefined}
      onClick={onMessage}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onMessage();
        }
      }}
      className={cn(rowClassName, "cursor-pointer")}
    >
      {content}
    </div>
  );
}
