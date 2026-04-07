"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/lib/actions";

export function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleLogout() {
    if (pending) return;
    startTransition(async () => {
      const loadingId = toast.loading("Signing out…");
      try {
        const result = await logoutAction();
        toast.dismiss(loadingId);
        if (result.ok) {
          if (result.message) toast.success(result.message);
          router.push(result.redirectTo ?? "/");
          router.refresh();
        } else {
          toast.error(result.error);
        }
      } catch {
        toast.dismiss(loadingId);
        toast.error("Could not sign out. Please try again.");
      }
    });
  }

  return (
    <button
      type="button"
      className="btn btn-outline btn-sm btn-with-icon"
      onClick={handleLogout}
      disabled={pending}
      aria-busy={pending}
    >
      <LogOut size={15} strokeWidth={2} aria-hidden />
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
