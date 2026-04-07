"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      closeButton
      richColors
      expand={false}
      duration={5000}
      gap={10}
      toastOptions={{
        classNames: {
          toast: "app-toast",
          title: "app-toast-title",
          description: "app-toast-desc",
          closeButton: "app-toast-close",
        },
      }}
    />
  );
}
