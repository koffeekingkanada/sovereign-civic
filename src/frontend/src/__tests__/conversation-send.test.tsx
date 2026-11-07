import type { backendInterface } from "@/backend";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ME, OTHER, makeActor, makeMessage } from "@/__tests__/support";
import { useSendMessage } from "@/hooks/useProfile";

/**
 * Cover for the conversation send contract after the accepted change: the
 * composer's send path hands the backend the plain text the user typed, with no
 * browser-side encryption. This pins the hook boundary the page calls, so a
 * regression that reintroduces a transform before `sendMessage` fails here.
 *
 * The actor is a typed local mock: this proves the consumer contract only, not
 * real canister behavior.
 */

let actor: backendInterface;

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor, isFetching: false }),
  useInternetIdentity: () => ({}),
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  actor = makeActor();
});

describe("conversation send contract", () => {
  it("forwards the plain text the user typed to sendMessage", async () => {
    vi.mocked(actor.sendMessage).mockResolvedValue(
      makeMessage(ME, OTHER, "secret plan", 1_000_000_000n),
    );

    const { result } = renderHook(() => useSendMessage(OTHER), { wrapper });
    await result.current.mutateAsync("secret plan");

    expect(actor.sendMessage).toHaveBeenCalledWith(OTHER, "secret plan");
    expect(actor.sendMessage).not.toHaveBeenCalledWith(
      OTHER,
      "enc:secret plan",
    );
  });
});
