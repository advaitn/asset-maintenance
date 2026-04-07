import { Prisma } from "@prisma/client";

export type ActionResult =
  | { ok: true; message?: string; redirectTo?: string }
  | { ok: false; error: string };

export function formatActionError(e: unknown): string {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") return "That value already exists.";
    if (e.code === "P2025") return "The record was not found or was already removed.";
    return "We couldn’t save your changes. Please try again.";
  }
  if (e instanceof Error) {
    if (e.message === "Unauthorized") return "Your session has expired. Please sign in again.";
    return e.message;
  }
  return "Something went wrong. Please try again.";
}

/** Wraps server action body: converts thrown errors into `{ ok: false }`. */
export async function safeAction(run: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await run();
  } catch (e) {
    return { ok: false, error: formatActionError(e) };
  }
}
