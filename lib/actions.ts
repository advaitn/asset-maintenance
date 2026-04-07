"use server";

import { AuthError } from "next-auth";
import { prisma } from "./prisma";
import { auth } from "./auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import type { ActionResult } from "./action-result";
import { safeAction } from "./action-result";

async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user as { id: string; role: string; name: string };
}

function correlationId() {
  return crypto.randomUUID();
}

type AuditCtx = { clientIp: string; userAgent: string };

async function auditCtx(): Promise<AuditCtx> {
  const h = await headers();
  return {
    clientIp: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "127.0.0.1",
    userAgent: h.get("user-agent") ?? "",
  };
}

async function writeHistory(
  taskId: number,
  oldStatus: string | null,
  newStatus: string,
  changedById: string,
  comment: string,
  ctx: AuditCtx
) {
  await prisma.taskHistory.create({
    data: {
      taskId,
      oldStatus: oldStatus ?? "—",
      newStatus,
      changedById,
      comment,
      clientIp: ctx.clientIp,
      userEnvironment: ctx.userAgent,
      correlationId: correlationId(),
    },
  });
}

async function bumpTaskOrThrow(
  taskId: number,
  expectedVersion: number,
  data: Omit<Prisma.MaintenanceTaskUncheckedUpdateManyInput, "versionNumber" | "id">
) {
  const result = await prisma.maintenanceTask.updateMany({
    where: { id: taskId, versionNumber: expectedVersion },
    data: {
      ...data,
      versionNumber: { increment: 1 },
    },
  });
  if (result.count === 0) {
    throw new Error("This task was updated by someone else. Refresh the page and try again.");
  }
}

function assertAssignedTechnician(task: { assignedToId: string | null }, userId: string) {
  if (task.assignedToId !== userId) {
    throw new Error("This task is not assigned to you");
  }
}

function parseMaterialItems(raw: FormDataEntryValue | null): Array<{ description: string; quantity: string }> {
  if (raw == null || typeof raw !== "string") throw new Error("Invalid material payload");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid material JSON");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("At least one material line is required");
  }
  const out: Array<{ description: string; quantity: string }> = [];
  for (const row of parsed) {
    if (!row || typeof row !== "object") throw new Error("Invalid material line");
    const rec = row as Record<string, unknown>;
    const d = rec.description;
    const q = rec.quantity;
    if (typeof d !== "string" || !d.trim()) throw new Error("Each material needs a non-empty description");
    out.push({
      description: d.trim(),
      quantity: typeof q === "string" && q.trim() ? q.trim() : "1",
    });
  }
  return out;
}

const PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;

function parsePriority(value: string | null): (typeof PRIORITIES)[number] {
  const p = (value || "Medium").trim();
  if (!PRIORITIES.includes(p as (typeof PRIORITIES)[number])) throw new Error("Invalid priority");
  return p as (typeof PRIORITIES)[number];
}

async function resolveMaterialBatchOutcome(taskId: number, managerId: string, ctx: AuditCtx) {
  const pending = await prisma.materialRequest.count({
    where: { taskId, requestStatus: "Pending" },
  });
  if (pending > 0) return;

  const task = await prisma.maintenanceTask.findUnique({ where: { id: taskId } });
  if (!task || task.status !== "MaterialRequested") return;

  const approved = await prisma.materialRequest.count({
    where: { taskId, requestStatus: "Approved" },
  });

  if (approved > 0) {
    await bumpTaskOrThrow(taskId, task.versionNumber, {
      status: "MaterialApproved",
      lastModifiedById: managerId,
      lastModifiedDate: new Date(),
      lastModifiedClientIp: ctx.clientIp,
      lastModifiedUserAgent: ctx.userAgent,
    });
    await writeHistory(
      taskId,
      "MaterialRequested",
      "MaterialApproved",
      managerId,
      "All open material requests resolved; at least one approved",
      ctx
    );
  } else {
    await bumpTaskOrThrow(taskId, task.versionNumber, {
      status: "InProgress",
      lastModifiedById: managerId,
      lastModifiedDate: new Date(),
      lastModifiedClientIp: ctx.clientIp,
      lastModifiedUserAgent: ctx.userAgent,
    });
    await writeHistory(
      taskId,
      "MaterialRequested",
      "InProgress",
      managerId,
      "All material requests were rejected; continue work using stock on hand or an alternate plan",
      ctx
    );
  }
}

function generateTaskCode(num: number): string {
  const padded = String(num).padStart(4, "0");
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let suffix = "";
  for (let i = 0; i < 3; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `TSK-${padded}-${suffix}`;
}

export async function createTask(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await getSessionOrThrow();
    if (user.role !== "Worker") throw new Error("Only workers can report issues");
    const ctx = await auditCtx();

    const title = (formData.get("title") as string)?.trim();
    const description = ((formData.get("description") as string) || "").trim();
    const assetId = Number(formData.get("assetId"));
    let priority: (typeof PRIORITIES)[number];
    try {
      priority = parsePriority(formData.get("priority") as string | null);
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : "Invalid priority");
    }

    if (!title || !Number.isFinite(assetId) || assetId < 1) throw new Error("Missing required fields");

    const asset = await prisma.asset.findFirst({
      where: { id: assetId, isActive: true },
    });
    if (!asset) throw new Error("Asset not found or inactive");

    const counter = await prisma.taskCounter.update({
      where: { id: 1 },
      data: { lastNumber: { increment: 1 } },
    });

    const taskCode = generateTaskCode(counter.lastNumber);

    const task = await prisma.maintenanceTask.create({
      data: {
        taskCode,
        title,
        description,
        priority,
        assetId,
        reportedById: user.id,
        createdById: user.id,
        lastModifiedById: user.id,
        lastModifiedClientIp: ctx.clientIp,
        lastModifiedUserAgent: ctx.userAgent,
      },
    });

    await writeHistory(task.id, null, "Reported", user.id, "Task reported", ctx);
    revalidatePath("/");
    return {
      ok: true,
      redirectTo: `/tasks/${task.id}`,
      message: `Issue logged as ${taskCode}.`,
    };
  });
}

export async function assignTask(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await getSessionOrThrow();
    if (user.role !== "Manager") throw new Error("Only managers can assign tasks");
    const ctx = await auditCtx();

    const taskId = Number(formData.get("taskId"));
    const techId = (formData.get("techId") as string)?.trim();
    if (!taskId || !techId) throw new Error("Missing fields");

    const tech = await prisma.account.findFirst({
      where: { id: techId, role: "Technician", isActive: true },
    });
    if (!tech) throw new Error("Invalid or inactive technician");

    const task = await prisma.maintenanceTask.findUnique({ where: { id: taskId } });
    if (!task || task.status !== "Reported") throw new Error("Task must be in Reported status");

    await bumpTaskOrThrow(taskId, task.versionNumber, {
      status: "Assigned",
      assignedToId: techId,
      lastModifiedById: user.id,
      lastModifiedDate: new Date(),
      lastModifiedClientIp: ctx.clientIp,
      lastModifiedUserAgent: ctx.userAgent,
    });

    await writeHistory(taskId, "Reported", "Assigned", user.id, `Assigned to ${tech.fullName}`, ctx);
    revalidatePath("/");
    return {
      ok: true,
      redirectTo: `/tasks/${taskId}`,
      message: `Assigned to ${tech.fullName}.`,
    };
  });
}

export async function pickUpTask(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await getSessionOrThrow();
    if (user.role !== "Technician") throw new Error("Only technicians can pick up tasks");
    const ctx = await auditCtx();

    const taskId = Number(formData.get("taskId"));
    const task = await prisma.maintenanceTask.findUnique({ where: { id: taskId } });
    if (!task || task.status !== "Assigned") throw new Error("Task must be in Assigned status");
    assertAssignedTechnician(task, user.id);

    await bumpTaskOrThrow(taskId, task.versionNumber, {
      status: "InProgress",
      lastModifiedById: user.id,
      lastModifiedDate: new Date(),
      lastModifiedClientIp: ctx.clientIp,
      lastModifiedUserAgent: ctx.userAgent,
    });

    await writeHistory(taskId, "Assigned", "InProgress", user.id, "Picked up task", ctx);
    revalidatePath("/");
    return {
      ok: true,
      redirectTo: `/tasks/${taskId}`,
      message: "Task is now in progress.",
    };
  });
}

export async function submitMaterialRequests(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await getSessionOrThrow();
    if (user.role !== "Technician") throw new Error("Only technicians can request materials");
    const ctx = await auditCtx();

    const taskId = Number(formData.get("taskId"));
    let items: Array<{ description: string; quantity: string }>;
    try {
      items = parseMaterialItems(formData.get("items"));
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : "Invalid materials");
    }

    const task = await prisma.maintenanceTask.findUnique({ where: { id: taskId } });
    if (!task || task.status !== "InProgress") throw new Error("Task must be InProgress");
    assertAssignedTechnician(task, user.id);

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.materialRequest.create({
          data: {
            taskId,
            description: item.description,
            quantity: item.quantity,
            createdById: user.id,
            lastModifiedById: user.id,
            lastModifiedClientIp: ctx.clientIp,
          },
        });
      }
      const updated = await tx.maintenanceTask.updateMany({
        where: { id: taskId, versionNumber: task.versionNumber },
        data: {
          status: "MaterialRequested",
          lastModifiedById: user.id,
          lastModifiedDate: new Date(),
          lastModifiedClientIp: ctx.clientIp,
          lastModifiedUserAgent: ctx.userAgent,
          versionNumber: { increment: 1 },
        },
      });
      if (updated.count === 0) {
        throw new Error("This task was updated by someone else. Refresh the page and try again.");
      }
    });

    await writeHistory(taskId, "InProgress", "MaterialRequested", user.id, `${items.length} material(s) requested`, ctx);
    revalidatePath("/");
    const n = items.length;
    return {
      ok: true,
      redirectTo: `/tasks/${taskId}`,
      message: n === 1 ? "Material request submitted." : `${n} material requests submitted.`,
    };
  });
}

export async function approveMaterial(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await getSessionOrThrow();
    if (user.role !== "Manager") throw new Error("Only managers can approve materials");
    const ctx = await auditCtx();

    const matId = Number(formData.get("matId"));
    const notes = ((formData.get("notes") as string) || "").trim();

    const existing = await prisma.materialRequest.findUnique({ where: { id: matId } });
    if (!existing || existing.requestStatus !== "Pending") {
      throw new Error("Material request not found or already resolved");
    }

    await prisma.materialRequest.update({
      where: { id: matId },
      data: {
        requestStatus: "Approved",
        resolvedDate: new Date(),
        managerNotes: notes,
        lastModifiedById: user.id,
        lastModifiedDate: new Date(),
        lastModifiedClientIp: ctx.clientIp,
      },
    });

    await resolveMaterialBatchOutcome(existing.taskId, user.id, ctx);
    revalidatePath("/");

    const pending = await prisma.materialRequest.count({
      where: { taskId: existing.taskId, requestStatus: "Pending" },
    });
    const message =
      pending === 0
        ? "Material approved. All open requests for this task are resolved."
        : "Material request approved.";

    return { ok: true, message };
  });
}

export async function rejectMaterial(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await getSessionOrThrow();
    if (user.role !== "Manager") throw new Error("Only managers can reject materials");
    const ctx = await auditCtx();

    const matId = Number(formData.get("matId"));
    const notes = ((formData.get("notes") as string) || "").trim();
    if (!notes) throw new Error("A rejection reason is required");

    const existing = await prisma.materialRequest.findUnique({ where: { id: matId } });
    if (!existing || existing.requestStatus !== "Pending") {
      throw new Error("Material request not found or already resolved");
    }

    await prisma.materialRequest.update({
      where: { id: matId },
      data: {
        requestStatus: "Rejected",
        resolvedDate: new Date(),
        managerNotes: notes,
        lastModifiedById: user.id,
        lastModifiedDate: new Date(),
        lastModifiedClientIp: ctx.clientIp,
      },
    });

    await resolveMaterialBatchOutcome(existing.taskId, user.id, ctx);
    revalidatePath("/");

    const pending = await prisma.materialRequest.count({
      where: { taskId: existing.taskId, requestStatus: "Pending" },
    });
    const message =
      pending === 0
        ? "Request rejected. All open requests for this task are resolved."
        : "Material request rejected.";

    return { ok: true, message };
  });
}

export async function resumeWork(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await getSessionOrThrow();
    if (user.role !== "Technician") throw new Error("Only technicians can resume work");
    const ctx = await auditCtx();

    const taskId = Number(formData.get("taskId"));
    const task = await prisma.maintenanceTask.findUnique({ where: { id: taskId } });
    if (!task || task.status !== "MaterialApproved") throw new Error("Task must be MaterialApproved");
    assertAssignedTechnician(task, user.id);

    await bumpTaskOrThrow(taskId, task.versionNumber, {
      status: "InProgress",
      lastModifiedById: user.id,
      lastModifiedDate: new Date(),
      lastModifiedClientIp: ctx.clientIp,
      lastModifiedUserAgent: ctx.userAgent,
    });

    await writeHistory(taskId, "MaterialApproved", "InProgress", user.id, "Resumed work after material approval", ctx);
    revalidatePath("/");
    return {
      ok: true,
      redirectTo: `/tasks/${taskId}`,
      message: "You can continue work on this task.",
    };
  });
}

export async function completeTask(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await getSessionOrThrow();
    if (user.role !== "Technician") throw new Error("Only technicians can complete tasks");
    const ctx = await auditCtx();

    const taskId = Number(formData.get("taskId"));
    const task = await prisma.maintenanceTask.findUnique({ where: { id: taskId } });
    if (!task || task.status !== "InProgress") throw new Error("Task must be InProgress");
    assertAssignedTechnician(task, user.id);

    await bumpTaskOrThrow(taskId, task.versionNumber, {
      status: "Completed",
      completedDate: new Date(),
      lastModifiedById: user.id,
      lastModifiedDate: new Date(),
      lastModifiedClientIp: ctx.clientIp,
      lastModifiedUserAgent: ctx.userAgent,
    });

    await writeHistory(taskId, "InProgress", "Completed", user.id, "Task completed", ctx);
    revalidatePath("/");
    return {
      ok: true,
      redirectTo: `/tasks/${taskId}`,
      message: "Work marked complete. Awaiting manager confirmation.",
    };
  });
}

export async function confirmTask(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await getSessionOrThrow();
    if (user.role !== "Manager") throw new Error("Only managers can confirm tasks");
    const ctx = await auditCtx();

    const taskId = Number(formData.get("taskId"));
    const task = await prisma.maintenanceTask.findUnique({ where: { id: taskId } });
    if (!task || task.status !== "Completed") throw new Error("Task must be Completed");

    await bumpTaskOrThrow(taskId, task.versionNumber, {
      status: "Confirmed",
      lastModifiedById: user.id,
      lastModifiedDate: new Date(),
      lastModifiedClientIp: ctx.clientIp,
      lastModifiedUserAgent: ctx.userAgent,
    });

    await writeHistory(taskId, "Completed", "Confirmed", user.id, "Task confirmed and closed", ctx);
    revalidatePath("/");
    return {
      ok: true,
      redirectTo: `/tasks/${taskId}`,
      message: "Task confirmed and closed.",
    };
  });
}

export async function rejectCompletion(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await getSessionOrThrow();
    if (user.role !== "Manager") throw new Error("Only managers can reject completions");
    const ctx = await auditCtx();

    const taskId = Number(formData.get("taskId"));
    const reason = ((formData.get("reason") as string) || "").trim();
    if (!reason) throw new Error("Rejection reason is required");

    const task = await prisma.maintenanceTask.findUnique({ where: { id: taskId } });
    if (!task || task.status !== "Completed") throw new Error("Task must be Completed");

    await bumpTaskOrThrow(taskId, task.versionNumber, {
      status: "InProgress",
      rejectionReason: reason,
      reworkCount: { increment: 1 },
      completedDate: null,
      lastModifiedById: user.id,
      lastModifiedDate: new Date(),
      lastModifiedClientIp: ctx.clientIp,
      lastModifiedUserAgent: ctx.userAgent,
    });

    await writeHistory(taskId, "Completed", "InProgress", user.id, `Rejected: ${reason}`, ctx);
    revalidatePath("/");
    return {
      ok: true,
      redirectTo: `/tasks/${taskId}`,
      message: "Returned to technician for rework.",
    };
  });
}

export async function createAsset(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await getSessionOrThrow();
    if (user.role !== "Manager") throw new Error("Only managers can create assets");

    const name = (formData.get("name") as string)?.trim();
    const location = ((formData.get("location") as string) || "").trim();
    const assetType = formData.get("assetType") as string;
    const departmentId = Number(formData.get("departmentId"));

    if (!name || !assetType || !Number.isFinite(departmentId) || departmentId < 1) {
      throw new Error("Missing required fields");
    }

    const dept = await prisma.department.findFirst({
      where: { id: departmentId, isActive: true },
    });
    if (!dept) throw new Error("Department not found or inactive");

    await prisma.asset.create({
      data: {
        name,
        location,
        assetType: assetType as Prisma.AssetUncheckedCreateInput["assetType"],
        departmentId,
      },
    });

    revalidatePath("/");
    return {
      ok: true,
      redirectTo: "/asset-mgmt",
      message: `Asset “${name}” was created.`,
    };
  });
}

export async function deactivateAsset(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await getSessionOrThrow();
    if (user.role !== "Manager") throw new Error("Only managers can manage assets");

    const assetId = Number(formData.get("assetId"));
    await prisma.asset.update({ where: { id: assetId }, data: { isActive: false } });
    revalidatePath("/");
    return { ok: true, message: "Asset deactivated. It will no longer appear on new reports." };
  });
}

export async function reactivateAsset(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await getSessionOrThrow();
    if (user.role !== "Manager") throw new Error("Only managers can manage assets");

    const assetId = Number(formData.get("assetId"));
    await prisma.asset.update({ where: { id: assetId }, data: { isActive: true } });
    revalidatePath("/");
    return { ok: true, message: "Asset reactivated." };
  });
}

export async function loginAction(formData: FormData): Promise<ActionResult> {
  const username = ((formData.get("username") as string) || "").trim();
  const password = (formData.get("password") as string) || "";
  if (!username || !password) {
    return { ok: false, error: "Enter your user ID or email and password." };
  }

  try {
    const { signIn } = await import("./auth");
    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    const res = result as { ok?: boolean; error?: string | null } | void;
    if (res != null && typeof res === "object" && res.ok === false) {
      return {
        ok: false,
        error: res.error?.trim() || "Invalid user ID, email, or password.",
      };
    }
    return { ok: true, redirectTo: "/dashboard", message: "Signed in successfully." };
  } catch (e) {
    if (e instanceof AuthError) {
      if (e.type === "CredentialsSignin") {
        return { ok: false, error: "Invalid user ID, email, or password." };
      }
      return {
        ok: false,
        error:
          "Server auth misconfiguration. On Vercel set AUTH_SECRET and AUTH_URL (https://your-app.vercel.app).",
      };
    }
    console.error("[loginAction]", e);
    return {
      ok: false,
      error:
        "Sign-in failed (often a database error on the server). Check Vercel logs and DATABASE_URL.",
    };
  }
}

export async function logoutAction(): Promise<ActionResult> {
  try {
    const { signOut } = await import("./auth");
    await signOut({ redirect: false });
    return { ok: true, redirectTo: "/", message: "You’re signed out." };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not sign out.",
    };
  }
}
