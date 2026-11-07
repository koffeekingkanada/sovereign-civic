import type { Message } from "@/backend";
import { cn } from "@/lib/utils";

/** Convert a Motoko nanosecond timestamp into a short local time label. */
export function formatTimestamp(timestamp: bigint): string {
  const date = new Date(Number(timestamp / 1_000_000n));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface MessageBubbleProps {
  message: Message;
  /** True when the signed-in user sent this message. */
  mine: boolean;
  /** 1-based position in the thread, used for deterministic markers. */
  index: number;
}

/** A single message in a 1-to-1 thread, aligned by sender. */
export function MessageBubble({ message, mine, index }: MessageBubbleProps) {
  return (
    <div
      data-ocid={`thread.message.${index + 1}`}
      className={cn("flex", mine ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-3.5 py-2.5 text-sm shadow-xs",
          mine
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <p
          className={cn(
            "mt-1 font-mono text-[10px]",
            mine ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {formatTimestamp(message.timestamp)}
        </p>
      </div>
    </div>
  );
}
