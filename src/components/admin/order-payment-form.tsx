"use client";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useActionForm } from "@/components/admin/use-action-form";
import { updateOrderPaymentAction } from "@/app/actions/leads";

export function OrderPaymentForm({
  orderId,
  advanceAmount,
  notes,
}: {
  orderId: string;
  advanceAmount: number;
  notes: string | null;
}) {
  const { formAction, pending } = useActionForm(updateOrderPaymentAction, {
    successMessage: "Payment updated.",
  });

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={orderId} />

      <Field label="Advance received" hint="Payment status updates automatically.">
        {({ id }) => (
          <Input
            id={id}
            name="advance_amount"
            type="number"
            min="0"
            step="1"
            defaultValue={advanceAmount}
          />
        )}
      </Field>

      <Field label="Notes">
        {({ id }) => <Textarea id={id} name="notes" rows={3} defaultValue={notes ?? ""} />}
      </Field>

      <Button type="submit" variant="admin" loading={pending} loadingLabel="Saving…">
        Save
      </Button>
    </form>
  );
}
