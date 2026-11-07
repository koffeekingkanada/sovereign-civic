import type { DirectoryEntry, Profile } from "@/backend";
import { DemoBadge } from "@/components/DemoBadge";
import { MessageBubble } from "@/components/MessageBubble";
import { MessageComposer } from "@/components/MessageComposer";
import { initials } from "@/components/UserListItem";
import { Skeleton } from "@/components/ui/skeleton";
import { useDirectory, useSendMessage, useThread } from "@/hooks/useProfile";
import { ArrowLeft } from "lucide-react";

interface ConversationPageProps {
  /** The other participant in this 1-to-1 conversation. */
  recipient: DirectoryEntry;
  /** The signed-in user, used to align sent messages. */
  me: Profile;
  /** Return to the directory list. */
  onBack: () => void;
}

/**
 * The full 1-to-1 thread between the signed-in user and the selected
 * participant, oldest to newest, with a composer to send new messages.
 */
export function ConversationPage({
  recipient,
  me,
  onBack,
}: ConversationPageProps) {
  const thread = useThread(recipient.principal, true);
  const sendMessage = useSendMessage(recipient.principal);
  const directory = useDirectory(true);
  const recipientIsDemo =
    directory.data?.find(
      (entry) => entry.principal.toText() === recipient.principal.toText(),
    )?.isDemo ?? recipient.isDemo;

  const messages = thread.data ?? [];

  const handleSend = (content: string) => sendMessage.mutateAsync(content);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          type="button"
          data-ocid="thread.back_button"
          onClick={onBack}
          aria-label="Back to directory"
          className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-smooth hover:bg-secondary hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </button>
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-primary font-display text-xs font-semibold text-primary-foreground"
        >
          {initials(recipient.displayName)}
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="truncate">{recipient.displayName}</span>
            {recipientIsDemo ? <DemoBadge /> : null}
          </p>
          <p className="truncate font-mono text-[11px] text-muted-foreground">
            {recipient.principal.toText()}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {thread.isLoading ? (
          <div
            data-ocid="thread.loading_state"
            className="space-y-3"
            aria-busy="true"
          >
            {Array.from({ length: 3 }, (_, i) => `thread-skeleton-${i}`).map(
              (id) => (
                <Skeleton key={id} className="h-12 w-2/3 rounded-lg" />
              ),
            )}
          </div>
        ) : thread.isError ? (
          <p
            data-ocid="thread.load_error_state"
            role="alert"
            className="py-8 text-center text-sm text-destructive"
          >
            This conversation could not be loaded. Please try again.
          </p>
        ) : messages.length === 0 ? (
          <div
            data-ocid="thread.empty_state"
            className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center"
          >
            <p className="font-display text-sm font-semibold text-foreground">
              No messages yet
            </p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Start the conversation with {recipient.displayName}. Messages are
              stored on your organization's infrastructure.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => (
              <MessageBubble
                key={`${message.timestamp.toString()}-${index}`}
                message={message}
                mine={message.sender.toText() === me.principal.toText()}
                index={index}
              />
            ))}
          </div>
        )}
      </div>

      <MessageComposer
        recipientName={recipient.displayName}
        isSending={sendMessage.isPending}
        isError={sendMessage.isError}
        onSend={handleSend}
      />
    </div>
  );
}
