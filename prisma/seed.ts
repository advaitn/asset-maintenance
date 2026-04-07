import "dotenv/config";
import { PrismaClient, type Prisma, type TaskStatus, type TaskPriority } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const TASK_COUNT = 50;
const PASSWORD = "Welcome1!";

const STATUSES: TaskStatus[] = [
  "Reported",
  "Assigned",
  "InProgress",
  "MaterialRequested",
  "MaterialApproved",
  "Completed",
  "Confirmed",
  "Cancelled",
];

const PRIORITIES: TaskPriority[] = ["Low", "Medium", "High", "Critical"];

const ISSUE_TEMPLATES = [
  "Belt misalignment near drive",
  "Unusual noise on startup",
  "Oil level below minimum",
  "Emergency stop flaky",
  "Vibration above baseline",
  "Seal weeping — monitor",
  "Control panel fault code",
  "Over-temp trip recurring",
  "Chain stretch section 2",
  "Sensor drift calibration",
  "Coupling guard damaged",
  "Coolant leak drip tray",
  "Fan motor hot to touch",
  "PLC I/O channel dead",
  "Pressure slow to build",
  "Limit switch stuck",
  "Gearbox whine under load",
  "Filter clogged indicator",
  "Conveyor speed unstable",
  "Ground fault intermittent",
];

function taskCodeFor(i: number): string {
  return `TSK-${String(i).padStart(4, "0")}-S${String(i).padStart(2, "0")}`;
}

/**
 * Inserts with explicit `id` do not advance PostgreSQL SERIAL sequences.
 * Without this, the next app-created row can reuse id 1 → P2002 "unique constraint"
 * (primary key), which surfaces as "That value already exists."
 */
async function syncPostgresIdSequences() {
  const tables = [
    "departments",
    "assets",
    "maintenance_tasks",
    "material_requests",
    "task_history",
    "task_counter",
  ] as const;
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`
      SELECT setval(
        pg_get_serial_sequence('${table}', 'id'),
        COALESCE((SELECT MAX(id) FROM "${table}"), 1),
        true
      )
    `);
  }
}

async function main() {
  await prisma.taskHistory.deleteMany();
  await prisma.materialRequest.deleteMany();
  await prisma.maintenanceTask.deleteMany();
  await prisma.taskCounter.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.department.deleteMany();
  await prisma.account.deleteMany();

  const hash = await bcrypt.hash(PASSWORD, 10);

  await prisma.account.createMany({
    data: [
      { id: "user1", fullName: "Alice", email: "alice@factory.com", passwordHash: hash, role: "Worker", isActive: true },
      { id: "user2", fullName: "Eddie", email: "eddie@factory.com", passwordHash: hash, role: "Worker", isActive: true },
      { id: "user3", fullName: "Fatima", email: "fatima@factory.com", passwordHash: hash, role: "Worker", isActive: true },
      { id: "manager1", fullName: "Bob", email: "bob@factory.com", passwordHash: hash, role: "Manager", isActive: true },
      { id: "tech1", fullName: "Carlos", email: "carlos@factory.com", passwordHash: hash, role: "Technician", isActive: true },
      { id: "tech2", fullName: "Diana", email: "diana@factory.com", passwordHash: hash, role: "Technician", isActive: true },
    ],
  });

  await prisma.department.createMany({
    data: [
      { id: 1, name: "Production", isActive: true },
      { id: 2, name: "Assembly", isActive: true },
      { id: 3, name: "Utilities", isActive: true },
      { id: 4, name: "Logistics", isActive: true },
      { id: 5, name: "Facilities", isActive: true },
    ],
  });

  await prisma.asset.createMany({
    data: [
      { id: 1, name: "CNC Machine #1", location: "Building A", assetType: "Motor", departmentId: 1, isActive: true },
      { id: 2, name: "Hydraulic Press #3", location: "Building B", assetType: "Pump", departmentId: 2, isActive: true },
      { id: 3, name: "Air Compressor #2", location: "Utility Room", assetType: "Compressor", departmentId: 3, isActive: true },
      { id: 4, name: "Conveyor Belt #5", location: "Building A", assetType: "Conveyor", departmentId: 4, isActive: true },
      { id: 5, name: "HVAC Unit #1", location: "Rooftop", assetType: "HVAC", departmentId: 5, isActive: true },
      { id: 6, name: "Old Generator", location: "Basement", assetType: "Electrical", departmentId: 3, isActive: false },
    ],
  });

  const now = Date.now();
  const ago = (ms: number) => new Date(now - ms);
  const DAY = 86400000;

  const workers = ["user1", "user2", "user3"] as const;
  const techs = ["tech1", "tech2"] as const;

  const tasks: Prisma.MaintenanceTaskCreateManyInput[] = [];

  for (let i = 1; i <= TASK_COUNT; i++) {
    const status = STATUSES[(i - 1) % STATUSES.length];
    const priority = PRIORITIES[(i - 1) % PRIORITIES.length];
    const reportedById = workers[(i - 1) % workers.length];
    const assignedToId =
      status === "Reported" || status === "Cancelled" ? null : techs[(i - 1) % techs.length];
    const assetId = ((i - 1) % 5) + 1;
    const title = `${ISSUE_TEMPLATES[(i - 1) % ISSUE_TEMPLATES.length]} (#${i})`;
    const description = `Seed issue ${i} — reported by ${reportedById}, asset ${assetId}.`;
    const ageMs = DAY * (i % 14) + (i % 24) * 3600000;
    const reworkCount = i === 18 ? 3 : i % 11 === 0 ? 1 : 0;
    const completedDate =
      status === "Confirmed" || status === "Completed" ? ago(ageMs - DAY) : null;
    const lastModifier =
      status === "Confirmed" ? "manager1" : assignedToId ?? reportedById;

    tasks.push({
      id: i,
      taskCode: taskCodeFor(i),
      title,
      description,
      status,
      priority,
      assetId,
      reportedById,
      assignedToId,
      createdById: reportedById,
      lastModifiedById: lastModifier,
      createdDate: ago(ageMs + DAY),
      lastModifiedDate: ago(ageMs),
      completedDate,
      rejectionReason: i === 18 ? "Spec not met on first pass" : "",
      reworkCount,
      versionNumber: 1 + ((i - 1) % 6),
      lastModifiedClientIp: `198.51.100.${(i % 200) + 20}`,
      lastModifiedUserAgent: `SeedClient/1.0 (task ${i}; ${reportedById})`,
    });
  }

  await prisma.maintenanceTask.createMany({ data: tasks });

  await prisma.taskCounter.upsert({
    where: { id: 1 },
    create: { id: 1, lastNumber: TASK_COUNT },
    update: { lastNumber: TASK_COUNT },
  });

  const historyData: Array<{
    taskId: number;
    oldStatus: string;
    newStatus: string;
    comment: string;
    changedById: string;
    timestamp: Date;
    clientIp: string;
    userEnvironment: string;
    correlationId: string;
  }> = [];

  for (let i = 1; i <= TASK_COUNT; i++) {
    const t = tasks[i - 1]!;
    const ageMs = DAY * (i % 14) + (i % 24) * 3600000;
    historyData.push({
      taskId: i,
      oldStatus: "—",
      newStatus: t.status!,
      comment: `Seed: reported by ${t.reportedById}`,
      changedById: t.reportedById,
      timestamp: ago(ageMs + DAY),
      clientIp: `203.0.113.${(i % 200) + 10}`,
      userEnvironment: "Mozilla/5.0 (seed)",
      correlationId: `seed-h-${i}`,
    });
  }

  await prisma.taskHistory.createMany({ data: historyData });

  const matRows: Array<{
    taskId: number;
    description: string;
    quantity: string;
    requestStatus: "Pending" | "Approved" | "Rejected";
    requestedDate: Date;
  }> = [];
  let mid = 0;
  for (const i of [3, 8, 13, 23, 28, 33, 38, 43]) {
    if (i > TASK_COUNT) continue;
    mid++;
    matRows.push({
      taskId: i,
      description: `Part kit M-${i}`,
      quantity: "1",
      requestStatus: "Pending",
      requestedDate: ago(DAY + i * 1000),
    });
  }
  if (matRows.length) {
    await prisma.materialRequest.createMany({
      data: matRows.map((r, j) => ({ id: j + 1, ...r })),
    });
  }

  await syncPostgresIdSequences();

  console.log(
    `Seed complete: 6 accounts (${workers.length} workers), 5 departments, 6 assets, ${TASK_COUNT} tasks, ${historyData.length} history rows, ${matRows.length} material requests`
  );
  console.log(`Password for all accounts: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
