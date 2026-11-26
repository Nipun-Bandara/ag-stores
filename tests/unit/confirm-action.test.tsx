import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Button } from "@/components/ui/button";

afterEach(cleanup);

it("focuses Cancel and does not submit its surrounding form or run a cancelled action", async () => {
  const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
  const confirm = vi.fn();
  render(
    <form onSubmit={submit}>
      <ConfirmAction
        title="Delete address"
        description="Delete Home?"
        confirmLabel="Delete"
        onConfirm={confirm}
      >
        <Button type="button">Delete Home</Button>
      </ConfirmAction>
    </form>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Delete Home" }));
  const dialog = screen.getByRole("alertdialog", { name: "Delete address" });
  await waitFor(() =>
    expect(
      within(dialog).getByRole("button", { name: "Cancel" }),
    ).toHaveFocus(),
  );
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  expect(confirm).not.toHaveBeenCalled();
  expect(submit).not.toHaveBeenCalled();
});

it("locks a pending action and keeps a failed request open for retry", async () => {
  let finish!: (value: boolean) => void;
  const confirm = vi.fn(
    () =>
      new Promise<boolean>((resolve) => {
        finish = resolve;
      }),
  );
  render(
    <ConfirmAction
      title="Clear cart"
      description="Remove all items?"
      confirmLabel="Clear cart"
      onConfirm={confirm}
    >
      <Button type="button">Empty basket</Button>
    </ConfirmAction>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Empty basket" }));
  let dialog = screen.getByRole("alertdialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Clear cart" }));
  expect(
    within(dialog).getByRole("button", { name: "Updating…" }),
  ).toBeDisabled();
  expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled();
  fireEvent.keyDown(dialog, { key: "Escape" });
  expect(confirm).toHaveBeenCalledTimes(1);
  finish(false);
  await waitFor(() =>
    expect(
      within(dialog).getByRole("button", { name: "Clear cart" }),
    ).toBeEnabled(),
  );
  dialog = screen.getByRole("alertdialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Clear cart" }));
  expect(confirm).toHaveBeenCalledTimes(2);
  finish(true);
  await waitFor(() =>
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
  );
});
