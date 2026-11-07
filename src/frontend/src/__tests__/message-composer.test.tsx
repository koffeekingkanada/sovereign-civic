import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { formatTimestamp } from "@/components/MessageBubble";
import { MessageComposer } from "@/components/MessageComposer";

/**
 * Characterization of messaging UI behavior that must survive the approval
 * change: the composer's draft handling and the timestamp label.
 */

function renderComposer(
  onSend: (content: string) => Promise<unknown>,
  overrides: { isSending?: boolean; isError?: boolean } = {},
) {
  return render(
    <MessageComposer
      recipientName="Grace Hopper"
      isSending={overrides.isSending ?? false}
      isError={overrides.isError ?? false}
      onSend={onSend}
    />,
  );
}

describe("MessageComposer", () => {
  it("disables Send until the draft has non-whitespace content", async () => {
    const user = userEvent.setup();
    renderComposer(vi.fn().mockResolvedValue(undefined));
    const send = screen.getByRole("button", { name: /send message/i });
    expect(send).toBeDisabled();

    await user.type(screen.getByLabelText("Message"), "   ");
    expect(send).toBeDisabled();

    await user.type(screen.getByLabelText("Message"), "hi");
    expect(send).toBeEnabled();
  });

  it("sends the trimmed draft and clears the box", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn().mockResolvedValue(undefined);
    renderComposer(onSend);

    const box = screen.getByLabelText("Message");
    await user.type(box, "  hello there  ");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(onSend).toHaveBeenCalledWith("hello there");
    expect(box).toHaveValue("");
  });

  it("restores the draft when the send is rejected", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn().mockRejectedValue(new Error("rejected"));
    renderComposer(onSend);

    const box = screen.getByLabelText("Message");
    await user.type(box, "keep me");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => expect(box).toHaveValue("keep me"));
  });

  it("shows an alert when the last send failed", () => {
    renderComposer(vi.fn().mockResolvedValue(undefined), { isError: true });
    expect(screen.getByRole("alert")).toHaveTextContent(
      /message could not be sent/i,
    );
  });

  it("does not send while a send is in flight", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn().mockResolvedValue(undefined);
    renderComposer(onSend, { isSending: true });

    await user.type(screen.getByLabelText("Message"), "wait");
    expect(
      screen.getByRole("button", { name: /send message/i }),
    ).toBeDisabled();
    expect(onSend).not.toHaveBeenCalled();
  });

  it("sends the trimmed draft when Enter is pressed", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn().mockResolvedValue(undefined);
    renderComposer(onSend);

    const box = screen.getByLabelText("Message");
    await user.type(box, "  enter sends  ");
    await user.keyboard("{Enter}");

    expect(onSend).toHaveBeenCalledWith("enter sends");
    expect(box).toHaveValue("");
  });

  it("inserts a newline instead of sending when Shift+Enter is pressed", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn().mockResolvedValue(undefined);
    renderComposer(onSend);

    const box = screen.getByLabelText("Message");
    await user.type(box, "line one");
    await user.keyboard("{Shift>}{Enter}{/Shift}");

    expect(onSend).not.toHaveBeenCalled();
    expect(box).toHaveValue("line one\n");
  });

  it("does not send on Enter when the draft is only whitespace", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn().mockResolvedValue(undefined);
    renderComposer(onSend);

    const box = screen.getByLabelText("Message");
    await user.type(box, "   ");
    await user.keyboard("{Enter}");

    expect(onSend).not.toHaveBeenCalled();
    expect(box).toHaveValue("   ");
  });
});

describe("MessageComposer on a phone or tablet", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  function stubCoarsePointer() {
    window.matchMedia = ((query: string) => ({
      matches: query.includes("pointer: coarse"),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }

  it("inserts a new line on Return instead of sending", async () => {
    stubCoarsePointer();
    const user = userEvent.setup();
    const onSend = vi.fn().mockResolvedValue(undefined);
    renderComposer(onSend);

    const box = screen.getByLabelText("Message");
    await user.type(box, "line one");
    await user.keyboard("{Enter}");

    expect(onSend).not.toHaveBeenCalled();
    expect(box).toHaveValue("line one\n");
  });

  it("sends only when the Send button is pressed", async () => {
    stubCoarsePointer();
    const user = userEvent.setup();
    const onSend = vi.fn().mockResolvedValue(undefined);
    renderComposer(onSend);

    const box = screen.getByLabelText("Message");
    await user.type(box, "send me");
    await user.keyboard("{Enter}");
    expect(onSend).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /send message/i }));
    expect(onSend).toHaveBeenCalledWith("send me");
    expect(box).toHaveValue("");
  });
});

describe("formatTimestamp", () => {
  it("renders a non-empty label for a nanosecond timestamp", () => {
    expect(formatTimestamp(1_700_000_000_000_000_000n)).not.toBe("");
  });
});
