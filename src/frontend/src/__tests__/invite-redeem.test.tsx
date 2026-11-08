import type { RedeemError, Result, backendInterface } from "@/backend";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ME, makeActor, makeProfile } from "@/__tests__/support";
import { InviteRedeem } from "@/components/InviteRedeem";

/**
 * The invite redemption journey: the 6-digit code entry reached from an invite
 * link after Internet Identity sign-in. The backend owns the real single-use,
 * expiry, cancellation and attempt rules; these tests check that the surface
 * sends the link token and code and reports every backend outcome.
 */

let actor: backendInterface;

vi.mock("@caffeineai/core-infrastructure", () => ({
  useInternetIdentity: () => ({}),
  useActor: () => ({ actor, isFetching: false }),
}));

function renderRedeem(linkToken = "inv-1-1700000000000000000") {
  const onRedeemed = vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <InviteRedeem linkToken={linkToken} onRedeemed={onRedeemed} />
    </QueryClientProvider>,
  );
  return { ...utils, onRedeemed };
}

function err(error: RedeemError): Result {
  return { __kind__: "err", err: error };
}

beforeEach(() => {
  actor = makeActor();
});

describe("invite redemption", () => {
  it("sends the link token and the 6-digit code and reports success", async () => {
    const user = userEvent.setup();
    vi.mocked(actor.redeemInvite).mockResolvedValue({
      __kind__: "ok",
      ok: makeProfile({ principal: ME }),
    });
    const { onRedeemed } = renderRedeem("inv-42-token");

    await user.type(await screen.findByLabelText(/6-digit code/i), "123456");
    await user.click(screen.getByRole("button", { name: /activate account/i }));

    await waitFor(() => {
      expect(actor.redeemInvite).toHaveBeenCalledWith("inv-42-token", "123456");
    });
    expect(
      await screen.findByText(/your account is active/i),
    ).toBeInTheDocument();
    await waitFor(() => expect(onRedeemed).toHaveBeenCalledTimes(1));
  });

  it("keeps the submit disabled until six digits are entered", async () => {
    const user = userEvent.setup();
    renderRedeem();

    const submit = await screen.findByRole("button", {
      name: /activate account/i,
    });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/6-digit code/i), "12345");
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/6-digit code/i), "6");
    expect(submit).toBeEnabled();
  });

  it("shows the remaining attempts after a wrong code", async () => {
    const user = userEvent.setup();
    vi.mocked(actor.redeemInvite).mockResolvedValue(
      err({ __kind__: "wrongCode", wrongCode: { remaining: 3n } }),
    );
    const { onRedeemed } = renderRedeem();

    await user.type(await screen.findByLabelText(/6-digit code/i), "000000");
    await user.click(screen.getByRole("button", { name: /activate account/i }));

    expect(
      await screen.findByText(
        /that code is not correct\. 3 attempts remaining/i,
      ),
    ).toBeInTheDocument();
    expect(onRedeemed).not.toHaveBeenCalled();
  });

  it("uses the singular attempt wording when one attempt remains", async () => {
    const user = userEvent.setup();
    vi.mocked(actor.redeemInvite).mockResolvedValue(
      err({ __kind__: "wrongCode", wrongCode: { remaining: 1n } }),
    );
    renderRedeem();

    await user.type(await screen.findByLabelText(/6-digit code/i), "000000");
    await user.click(screen.getByRole("button", { name: /activate account/i }));

    expect(
      await screen.findByText(
        /1 attempt remaining before this invite is cancelled/i,
      ),
    ).toBeInTheDocument();
  });

  it.each([
    [
      { __kind__: "tooManyAttempts", tooManyAttempts: null } as RedeemError,
      /too many incorrect codes\. this invite has been cancelled/i,
    ],
    [
      { __kind__: "expired", expired: null } as RedeemError,
      /this invite has expired/i,
    ],
    [
      { __kind__: "cancelled", cancelled: null } as RedeemError,
      /this invite has been cancelled/i,
    ],
    [
      { __kind__: "used", used: null } as RedeemError,
      /this invite has already been used/i,
    ],
    [
      { __kind__: "notFound", notFound: null } as RedeemError,
      /this invite link is not valid/i,
    ],
  ])("reports the %s rejection", async (error, message) => {
    const user = userEvent.setup();
    vi.mocked(actor.redeemInvite).mockResolvedValue(err(error));
    const { onRedeemed } = renderRedeem();

    await user.type(await screen.findByLabelText(/6-digit code/i), "000000");
    await user.click(screen.getByRole("button", { name: /activate account/i }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(onRedeemed).not.toHaveBeenCalled();
  });

  it("reports a transport failure without claiming the account is active", async () => {
    const user = userEvent.setup();
    vi.mocked(actor.redeemInvite).mockRejectedValue(new Error("network down"));
    const { onRedeemed } = renderRedeem();

    await user.type(await screen.findByLabelText(/6-digit code/i), "123456");
    await user.click(screen.getByRole("button", { name: /activate account/i }));

    expect(
      await screen.findByText(/we could not reach the service/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/your account is active/i),
    ).not.toBeInTheDocument();
    expect(onRedeemed).not.toHaveBeenCalled();
  });
});
