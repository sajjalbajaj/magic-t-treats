"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Button, type ButtonProps } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Toggle } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { ActionResult } from "@/types/domain";

/* ---------------------------------------------------------------------------
   Client wrappers around server actions.

   Every admin mutation goes through one of these, so pending state, success
   and failure feedback, and the post-mutation refresh behave the same way on
   every screen — the baker should never be left wondering whether a tap
   registered.
--------------------------------------------------------------------------- */

/** Fires a server action, toasts the outcome, refreshes the route. */
export function ActionButton({
  action,
  children,
  successMessage,
  confirm,
  confirmTitle = "Are you sure?",
  confirmLabel = "Yes, continue",
  ...buttonProps
}: Omit<ButtonProps, "onClick" | "loading"> & {
  action: () => Promise<ActionResult<unknown>>;
  children: ReactNode;
  successMessage?: string;
  /** When set, a confirmation dialog is shown first. */
  confirm?: string;
  confirmTitle?: string;
  confirmLabel?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const run = () => {
    setConfirming(false);
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        if (successMessage) toast(successMessage, "success");
        router.refresh();
      } else {
        toast(result.error.message, "error");
      }
    });
  };

  return (
    <>
      <Button
        {...buttonProps}
        loading={pending}
        onClick={() => (confirm ? setConfirming(true) : run())}
      >
        {children}
      </Button>

      {confirm ? (
        <Modal
          open={confirming}
          onClose={() => setConfirming(false)}
          title={confirmTitle}
          size="md"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="adminGhost" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={run} loading={pending}>
                {confirmLabel}
              </Button>
            </div>
          }
        >
          <p className="text-sm text-admin-ink">{confirm}</p>
        </Modal>
      ) : null}
    </>
  );
}

/**
 * On/off switch backed by a server action.
 *
 * Flips immediately and reverts if the write fails — the Available Today
 * screen is a rapid-fire list of toggles, and waiting for a round trip on each
 * one would make it feel broken.
 */
export function ActionToggle({
  checked,
  label,
  action,
  successMessage,
}: {
  checked: boolean;
  label: string;
  action: (next: boolean) => Promise<ActionResult<unknown>>;
  successMessage?: string;
}) {
  const [optimistic, setOptimistic] = useState(checked);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  return (
    <Toggle
      checked={optimistic}
      label={label}
      disabled={pending}
      onChange={(next) => {
        setOptimistic(next);
        startTransition(async () => {
          const result = await action(next);
          if (result.success) {
            if (successMessage) toast(successMessage, "success");
            router.refresh();
          } else {
            setOptimistic(!next);
            toast(result.error.message, "error");
          }
        });
      }}
    />
  );
}

/** Opens a dialog containing a form; used for all the "add / edit" screens. */
export function DialogTrigger({
  label,
  title,
  description,
  children,
  buttonProps,
  size = "lg",
}: {
  label: ReactNode;
  title: string;
  description?: string;
  children: (close: () => void) => ReactNode;
  buttonProps?: Omit<ButtonProps, "onClick">;
  size?: "md" | "lg" | "xl";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="admin" {...buttonProps} onClick={() => setOpen(true)}>
        {label}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description={description}
        size={size}
      >
        {children(() => setOpen(false))}
      </Modal>
    </>
  );
}
