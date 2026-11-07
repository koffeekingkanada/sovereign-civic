import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface MessageComposerProps {
  /** Display name of the recipient, used in the placeholder. */
  recipientName: string;
  /** True while a send is in flight. */
  isSending: boolean;
  /** True when the last send attempt failed. */
  isError: boolean;
  /** Persist a message. Resolves when the backend accepts it. */
  onSend: (content: string) => Promise<unknown>;
}

/** Viewport width below which a touch device counts as a phone or tablet. */
const TOUCH_VIEWPORT_MAX = 1024;

/**
 * Classify the current device from pointer and viewport capabilities. A coarse
 * pointer, or a touch screen on a narrow viewport, is a phone or tablet; a fine
 * pointer with a physical keyboard is a computer. When the browser exposes no
 * capability information (for example a non-browser test environment) the
 * device is treated as a computer so Enter keeps sending.
 */
function detectTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  const coarsePointer =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  const noHover =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(hover: none)").matches;
  const touchPoints =
    typeof navigator !== "undefined" ? navigator.maxTouchPoints : 0;
  const narrowViewport = window.innerWidth < TOUCH_VIEWPORT_MAX;
  return coarsePointer || noHover || (touchPoints > 0 && narrowViewport);
}

/**
 * Text box and send button for a 1-to-1 conversation. The draft is local UI
 * state: it clears on submit and is restored only if the send fails and the
 * user has not started typing something newer.
 *
 * On phones and tablets the Return key inserts a new line and the message is
 * sent only with the Send button; on computers Enter sends and Shift+Enter
 * inserts a new line.
 */
export function MessageComposer({
  recipientName,
  isSending,
  isError,
  onSend,
}: MessageComposerProps) {
  const [draft, setDraft] = useState("");
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const update = () => setIsTouchDevice(detectTouchDevice());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const canSend = draft.trim().length > 0 && !isSending;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || isSending) return;
    setDraft("");
    void onSend(content).catch(() => {
      setDraft((current) => (current === "" ? content : current));
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter") return;
    // On phones and tablets Return inserts a new line natively; the message is
    // sent only with the Send button.
    if (isTouchDevice) return;
    // On computers Shift+Enter inserts a new line and plain Enter sends through
    // the same submit path as the Send button, so the empty-draft and in-flight
    // guards apply unchanged.
    if (event.shiftKey) return;
    event.preventDefault();
    formRef.current?.requestSubmit();
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="border-t border-border px-4 py-3"
      data-ocid="thread.composer"
    >
      <label
        htmlFor="thread-message-input"
        className="mb-1.5 block text-xs font-medium text-muted-foreground"
      >
        Message
      </label>
      <div className="flex items-end gap-2">
        <Textarea
          id="thread-message-input"
          data-ocid="thread.message_input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${recipientName}…`}
          rows={2}
          maxLength={2000}
          className="min-h-[44px] resize-none"
          aria-label="Message"
        />
        <Button
          type="submit"
          data-ocid="thread.send_button"
          disabled={!canSend}
          className="h-11 shrink-0 rounded-md"
        >
          <Send className="size-4" aria-hidden="true" />
          <span className="sr-only">Send message</span>
        </Button>
      </div>
      {isError ? (
        <p
          data-ocid="thread.error_state"
          role="alert"
          className="mt-2 text-xs text-destructive"
        >
          Message could not be sent. Your draft has been kept — try again.
        </p>
      ) : null}
    </form>
  );
}
