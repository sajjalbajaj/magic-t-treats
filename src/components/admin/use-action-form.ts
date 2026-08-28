"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/ui/toast";
import type { ActionResult } from "@/types/domain";

type ServerFormAction<T> = (
  previous: ActionResult<T> | null,
  formData: FormData,
) => Promise<ActionResult<T>>;

/**
 * Wires a server action to a form, with toast feedback and a route refresh.
 *
 * The success/failure handling runs *inside* the action rather than in a
 * `useEffect` watching the result. Reacting to the result in an effect means a
 * synchronous setState during commit — a cascading render that React now
 * warns about — and it also misfires when the same result value comes back
 * twice. Doing the work in the action keeps it inside the transition, so the
 * pending state covers the refresh too.
 */
export function useActionForm<T>(
  action: ServerFormAction<T>,
  options: {
    successMessage?: string;
    /** Runs only on success, e.g. to close the dialog. */
    onSuccess?: (data: T) => void;
    /** Set false for forms that navigate away themselves. */
    refresh?: boolean;
  } = {},
) {
  const { toast } = useToast();
  const router = useRouter();

  const [state, formAction, pending] = useActionState<ActionResult<T> | null, FormData>(
    async (previous, formData) => {
      const result = await action(previous, formData);

      if (result.success) {
        if (options.successMessage) toast(options.successMessage, "success");
        if (options.refresh !== false) router.refresh();
        options.onSuccess?.(result.data);
      } else {
        toast(result.error.message, "error");
      }

      return result;
    },
    null,
  );

  return { state, formAction, pending };
}
