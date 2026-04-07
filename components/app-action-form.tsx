"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTransition, type FormEvent, type ReactNode } from "react";
import type { ActionResult } from "@/lib/action-result";

type Props = {
  action: (formData: FormData) => Promise<ActionResult>;
  children: ReactNode;
  loadingText?: string;
  className?: string;
  /** Runs after a successful action (before refresh). Use e.g. to close a popover. */
  onSuccess?: () => void;
};

export function AppActionForm({
  action,
  children,
  loadingText = "Saving…",
  className,
  onSuccess,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    const form = e.currentTarget;
    const fd = new FormData(form);

    startTransition(async () => {
      const loadingId = toast.loading(loadingText);
      try {
        const result = await action(fd);
        toast.dismiss(loadingId);
        if (result.ok) {
          if (result.message) toast.success(result.message);
          onSuccess?.();
          if (result.redirectTo) router.push(result.redirectTo);
          router.refresh();
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.dismiss(loadingId);
        toast.error("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className={className} aria-busy={pending}>
      <fieldset className="action-form-fieldset" disabled={pending}>
        {children}
      </fieldset>
    </form>
  );
}
