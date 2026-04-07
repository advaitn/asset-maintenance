import { prisma } from "./prisma";
import { UserRole, Prisma, TaskStatus, TaskPriority } from "@prisma/client";
import { taskPriorityLabel, taskStatusLabel } from "./labels";
import {
  DEFAULT_PAGE_SIZE,
  parseDateEndUtc,
  parseDateStartUtc,
  parsePage,
  parsePageSize,
} from "./pagination";
import { resolveTaskListSort } from "./task-list-sort";

export type TaskWithRelations = Prisma.MaintenanceTaskGetPayload<{
  include: {
    asset: { include: { department: true } };
    reportedBy: true;
    assignedTo: true;
    createdBy: true;
    lastModifiedBy: true;
    materialRequests: true;
    history: { include: { changedBy: true } };
  };
}>;

const taskListInclude = {
  asset: { include: { department: true } as const },
  reportedBy: true,
  assignedTo: true,
} as const;

export type TaskListRow = Prisma.MaintenanceTaskGetPayload<{ include: typeof taskListInclude }>;

export type TaskListFilterInput = {
  status?: string;
  priority?: string;
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
  pageSize?: string;
  sort?: string;
  dir?: string;
  /**
   * Technician only: `active` = work queue (excludes Confirmed/Cancelled).
   * `completed` = archive (Completed + Confirmed only).
   */
  technicianTaskScope?: "active" | "completed";
};

function taskWhere(userId: string, role: UserRole): Prisma.MaintenanceTaskWhereInput {
  switch (role) {
    case "Worker":
      return { reportedById: userId };
    case "Technician":
      return { assignedToId: userId };
    case "Manager":
      return {};
  }
}

/** Hidden from technician work queue (use completed archive instead). */
const TECHNICIAN_QUEUE_EXCLUDED: TaskStatus[] = ["Confirmed", "Cancelled"];

/** Technician “completed work” list: your done + manager-signed-off jobs. */
const TECHNICIAN_ARCHIVE_STATUSES: TaskStatus[] = ["Completed", "Confirmed"];

function technicianListBase(
  userId: string,
  scope: "active" | "completed"
): Prisma.MaintenanceTaskWhereInput {
  if (scope === "active") {
    return {
      assignedToId: userId,
      status: { notIn: TECHNICIAN_QUEUE_EXCLUDED },
    };
  }
  return {
    assignedToId: userId,
    status: { in: TECHNICIAN_ARCHIVE_STATUSES },
  };
}

function statusesMatchingToken(tok: string): TaskStatus[] {
  const lower = tok.toLowerCase();
  return (Object.values(TaskStatus) as TaskStatus[]).filter(
    (s) =>
      String(s).toLowerCase().includes(lower) || taskStatusLabel(s).toLowerCase().includes(lower)
  );
}

function prioritiesMatchingToken(tok: string): TaskPriority[] {
  const lower = tok.toLowerCase();
  return (Object.values(TaskPriority) as TaskPriority[]).filter(
    (p) =>
      String(p).toLowerCase().includes(lower) || taskPriorityLabel(p).toLowerCase().includes(lower)
  );
}

function keywordClauseForToken(tok: string): Prisma.MaintenanceTaskWhereInput {
  const statusIn = statusesMatchingToken(tok);
  const priorityIn = prioritiesMatchingToken(tok);
  const or: Prisma.MaintenanceTaskWhereInput[] = [
    { taskCode: { contains: tok, mode: "insensitive" } },
    { title: { contains: tok, mode: "insensitive" } },
    { description: { contains: tok, mode: "insensitive" } },
    {
      asset: {
        is: {
          OR: [
            { name: { contains: tok, mode: "insensitive" } },
            { location: { contains: tok, mode: "insensitive" } },
            { department: { name: { contains: tok, mode: "insensitive" } } },
          ],
        },
      },
    },
    { reportedBy: { is: { fullName: { contains: tok, mode: "insensitive" } } } },
    { assignedTo: { is: { fullName: { contains: tok, mode: "insensitive" } } } },
  ];
  if (statusIn.length) or.push({ status: { in: statusIn } });
  if (priorityIn.length) or.push({ priority: { in: priorityIn } });
  return { OR: or };
}

function buildTaskListWhere(
  base: Prisma.MaintenanceTaskWhereInput,
  filters: TaskListFilterInput
): Prisma.MaintenanceTaskWhereInput {
  const and: Prisma.MaintenanceTaskWhereInput[] = [base];

  if (filters.status && filters.status !== "All") {
    if ((Object.values(TaskStatus) as string[]).includes(filters.status)) {
      and.push({ status: filters.status as TaskStatus });
    }
  }
  if (filters.priority && filters.priority !== "All") {
    if ((Object.values(TaskPriority) as string[]).includes(filters.priority)) {
      and.push({ priority: filters.priority as TaskPriority });
    }
  }

  const from = parseDateStartUtc(filters.dateFrom);
  const to = parseDateEndUtc(filters.dateTo);
  if (from || to) {
    and.push({
      lastModifiedDate: {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      },
    });
  }

  const q = filters.q?.trim();
  if (q) {
    const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    for (const tok of tokens) {
      and.push(keywordClauseForToken(tok));
    }
  }

  return and.length === 1 ? and[0]! : { AND: and };
}

export async function getTaskListPage(userId: string, role: UserRole, filters: TaskListFilterInput) {
  const base =
    role === "Technician" ?
      technicianListBase(userId, filters.technicianTaskScope ?? "active")
    : taskWhere(userId, role);
  const where = buildTaskListWhere(base, filters);
  const page = parsePage(filters.page, 1);
  const pageSize = parsePageSize(filters.pageSize);
  const skip = (page - 1) * pageSize;
  const { orderBy, column: sortColumn, dir: sortDir } = resolveTaskListSort(filters);

  const [filteredTotal, baseTotal, rows] = await prisma.$transaction([
    prisma.maintenanceTask.count({ where }),
    prisma.maintenanceTask.count({ where: base }),
    prisma.maintenanceTask.findMany({
      where,
      include: taskListInclude,
      orderBy,
      skip,
      take: pageSize,
    }),
  ]);

  return { rows, filteredTotal, baseTotal, page, pageSize, sortColumn, sortDir };
}

/** Task header + metadata; no materials or history (load those paginated on the detail page). */
export async function getTaskById(taskId: number, userId: string, role: UserRole) {
  const where: Prisma.MaintenanceTaskWhereInput = { id: taskId, ...taskWhere(userId, role) };
  return prisma.maintenanceTask.findFirst({
    where,
    include: {
      asset: { include: { department: true } },
      reportedBy: true,
      assignedTo: true,
      createdBy: true,
      lastModifiedBy: true,
    },
  });
}

export async function getPendingMaterialRequestsForTask(
  taskId: number,
  userId: string,
  role: UserRole
) {
  const task = await prisma.maintenanceTask.findFirst({
    where: { id: taskId, ...taskWhere(userId, role) },
    select: { id: true },
  });
  if (!task) return [];
  return prisma.materialRequest.findMany({
    where: { taskId, requestStatus: "Pending" },
    orderBy: { requestedDate: "desc" },
  });
}

export type MaterialPageFilters = {
  page?: string;
  pageSize?: string;
  dateFrom?: string;
  dateTo?: string;
};

export async function getTaskMaterialsPage(
  taskId: number,
  userId: string,
  role: UserRole,
  filters: MaterialPageFilters
) {
  const task = await prisma.maintenanceTask.findFirst({
    where: { id: taskId, ...taskWhere(userId, role) },
    select: { id: true },
  });
  if (!task) return null;

  const page = parsePage(filters.page, 1);
  const pageSize = parsePageSize(filters.pageSize);
  const skip = (page - 1) * pageSize;
  const from = parseDateStartUtc(filters.dateFrom);
  const to = parseDateEndUtc(filters.dateTo);

  const dateWhere: Prisma.DateTimeFilter = {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {}),
  };
  const where: Prisma.MaterialRequestWhereInput = {
    taskId,
    ...(Object.keys(dateWhere).length ? { requestedDate: dateWhere } : {}),
  };

  const [total, rows] = await prisma.$transaction([
    prisma.materialRequest.count({ where }),
    prisma.materialRequest.findMany({
      where,
      orderBy: { requestedDate: "desc" },
      skip,
      take: pageSize,
    }),
  ]);

  return { rows, total, page, pageSize };
}

export type HistoryPageFilters = {
  page?: string;
  pageSize?: string;
  dateFrom?: string;
  dateTo?: string;
};

export async function getTaskHistoryPage(
  taskId: number,
  userId: string,
  role: UserRole,
  filters: HistoryPageFilters
) {
  const task = await prisma.maintenanceTask.findFirst({
    where: { id: taskId, ...taskWhere(userId, role) },
    select: { id: true },
  });
  if (!task) return null;

  const page = parsePage(filters.page, 1);
  const pageSize = parsePageSize(filters.pageSize);
  const skip = (page - 1) * pageSize;
  const from = parseDateStartUtc(filters.dateFrom);
  const to = parseDateEndUtc(filters.dateTo);

  const dateWhere: Prisma.DateTimeFilter = {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {}),
  };
  const where: Prisma.TaskHistoryWhereInput = {
    taskId,
    ...(Object.keys(dateWhere).length ? { timestamp: dateWhere } : {}),
  };

  const [total, rows] = await prisma.$transaction([
    prisma.taskHistory.count({ where }),
    prisma.taskHistory.findMany({
      where,
      include: { changedBy: true },
      orderBy: { timestamp: "desc" },
      skip,
      take: pageSize,
    }),
  ]);

  return { rows, total, page, pageSize };
}

export async function getAssetsPaginated(filters: { page?: string; pageSize?: string; q?: string }) {
  const page = parsePage(filters.page, 1);
  const pageSize = parsePageSize(filters.pageSize);
  const skip = (page - 1) * pageSize;
  const q = filters.q?.trim();

  const where: Prisma.AssetWhereInput =
    q ?
      {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { location: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const [total, rows] = await prisma.$transaction([
    prisma.asset.count({ where }),
    prisma.asset.findMany({
      where,
      include: { department: true },
      orderBy: { name: "asc" },
      skip,
      take: pageSize,
    }),
  ]);

  return { rows, total, page, pageSize };
}

export async function getAssets() {
  return prisma.asset.findMany({
    include: { department: true },
    orderBy: { name: "asc" },
  });
}

export async function getActiveAssets() {
  return prisma.asset.findMany({
    where: { isActive: true },
    include: { department: true },
    orderBy: { name: "asc" },
  });
}

export async function getDepartments() {
  return prisma.department.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function getTechnicians() {
  return prisma.account.findMany({
    where: { role: "Technician", isActive: true },
    orderBy: { fullName: "asc" },
  });
}

export async function getAccounts() {
  return prisma.account.findMany({
    orderBy: { fullName: "asc" },
  });
}

export async function getDashboardStats(userId: string, role: UserRole) {
  const where =
    role === "Technician" ? technicianListBase(userId, "active") : taskWhere(userId, role);
  const [total, reported, inProgress, matReq, completed, escalated] = await Promise.all([
    prisma.maintenanceTask.count({ where }),
    prisma.maintenanceTask.count({ where: { ...where, status: "Reported" } }),
    prisma.maintenanceTask.count({ where: { ...where, status: "InProgress" } }),
    prisma.maintenanceTask.count({ where: { ...where, status: "MaterialRequested" } }),
    prisma.maintenanceTask.count({ where: { ...where, status: "Completed" } }),
    prisma.maintenanceTask.count({ where: { ...where, reworkCount: { gte: 3 } } }),
  ]);
  return { total, reported, inProgress, matReq, completed, escalated };
}
