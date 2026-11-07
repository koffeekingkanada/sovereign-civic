import type { DirectoryEntry, Profile } from "@/backend";
import { UserListItem } from "@/components/UserListItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDirectory } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";
import { ConversationPage } from "@/pages/ConversationPage";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

interface DirectoryPageProps {
  me: Profile;
  onEditProfile: () => void;
}

export function DirectoryPage({ me, onEditProfile }: DirectoryPageProps) {
  const directory = useDirectory(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DirectoryEntry | null>(null);

  const entries = useMemo(() => {
    const all = directory.data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (entry) =>
        entry.displayName.toLowerCase().includes(q) ||
        entry.principal.toText().toLowerCase().includes(q),
    );
  }, [directory.data, query]);

  const others = useMemo(
    () =>
      (directory.data ?? []).filter(
        (entry) => entry.principal.toText() !== me.principal.toText(),
      ),
    [directory.data, me.principal],
  );

  const isSelf = (entry: DirectoryEntry) =>
    entry.principal.toText() === me.principal.toText();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-10">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Registered staff
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Directory
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            Signed in as{" "}
            <span className="font-medium text-foreground">{me.fullName}</span>
          </span>
          <Button
            type="button"
            variant="outline"
            data-ocid="profile.edit_button"
            onClick={onEditProfile}
            className="rounded-md"
          >
            Edit profile
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <section
          aria-label="Directory"
          className={cn(
            "min-w-0 rounded-lg border border-border bg-card shadow-card-resting",
            selected ? "hidden lg:block" : "block",
          )}
        >
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                data-ocid="directory.search_input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name or principal"
                aria-label="Search directory"
                className="pl-9"
              />
            </div>
          </div>

          <div className="max-h-[28rem] overflow-y-auto p-2">
            {directory.isLoading ? (
              <div
                data-ocid="directory.loading_state"
                className="space-y-2 p-1"
                aria-busy="true"
              >
                {Array.from(
                  { length: 4 },
                  (_, i) => `directory-skeleton-${i}`,
                ).map((id) => (
                  <Skeleton key={id} className="h-14 w-full rounded-md" />
                ))}
              </div>
            ) : directory.isError ? (
              <p
                data-ocid="directory.error_state"
                role="alert"
                className="p-3 text-sm text-destructive"
              >
                The directory could not be loaded. Please refresh and try again.
              </p>
            ) : entries.length === 0 ? (
              <div
                data-ocid="directory.empty_state"
                className="px-3 py-10 text-center"
              >
                <p className="font-display text-sm font-semibold text-foreground">
                  {query ? "No matching staff" : "No other staff registered"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {query
                    ? "Try a different name or principal."
                    : "Once colleagues register, they will appear here."}
                </p>
              </div>
            ) : (
              <ul className="space-y-1">
                {entries.map((entry, index) => (
                  <li key={entry.principal.toText()} className="min-w-0">
                    <UserListItem
                      entry={entry}
                      index={index}
                      isSelf={isSelf(entry)}
                      selected={
                        selected?.principal.toText() ===
                        entry.principal.toText()
                      }
                      onMessage={() => setSelected(entry)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section
          aria-label="Conversation"
          className={cn(
            "min-h-[28rem] overflow-hidden rounded-lg border border-border bg-card shadow-card-resting",
            selected ? "block" : "hidden lg:block",
          )}
        >
          {selected ? (
            <ConversationPage
              recipient={selected}
              me={me}
              onBack={() => setSelected(null)}
            />
          ) : (
            <div
              data-ocid="thread.placeholder_state"
              className="flex h-full min-h-[28rem] flex-col items-center justify-center gap-2 px-6 text-center"
            >
              <p className="font-display text-base font-semibold text-foreground">
                {others.length === 0
                  ? "No colleagues to message yet"
                  : "Select a colleague"}
              </p>
              <p className="max-w-xs text-sm text-muted-foreground">
                {others.length === 0
                  ? "When other staff register, you can start a direct conversation with them here."
                  : "Choose someone from the directory to open a direct conversation."}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
