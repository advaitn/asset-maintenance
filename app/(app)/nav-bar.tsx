"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CircleCheck,
  ClipboardList,
  ClipboardPlus,
  LayoutDashboard,
  ListTodo,
  Warehouse,
} from "lucide-react";
import { taskQueueNavLabel, technicianCompletedNavLabel } from "@/lib/labels";

const dashboardLink = {
  href: "/dashboard",
  label: "Dashboard",
  roles: ["Manager", "Technician", "Worker"],
  Icon: LayoutDashboard,
};

const reportIssueLink = {
  href: "/report-issue",
  label: "Report issue",
  roles: ["Worker"],
  Icon: ClipboardPlus,
};

const assetMgmtLink = {
  href: "/asset-mgmt",
  label: "Asset management",
  roles: ["Manager"],
  Icon: Warehouse,
};

export function NavBar({ role }: { role: string }) {
  const pathname = usePathname();

  const showTaskQueue = role === "Worker" || role === "Technician";
  const TaskQueueIcon = role === "Worker" ? ClipboardList : ListTodo;
  const DashboardIcon = dashboardLink.Icon;
  const ReportIssueIcon = reportIssueLink.Icon;
  const AssetMgmtIcon = assetMgmtLink.Icon;

  return (
    <nav className="nav">
      {dashboardLink.roles.includes(role) && (
        <Link
          href={dashboardLink.href}
          className={pathname.startsWith(dashboardLink.href) ? "active" : ""}
        >
          <DashboardIcon size={16} strokeWidth={2} aria-hidden />
          {dashboardLink.label}
        </Link>
      )}
      {showTaskQueue && (
        <Link
          href="/my-tasks"
          className={
            role === "Technician" ?
              pathname === "/my-tasks" ? "active" : ""
            : pathname.startsWith("/my-tasks") ? "active" : ""
          }
        >
          <TaskQueueIcon size={16} strokeWidth={2} aria-hidden />
          {taskQueueNavLabel(role)}
        </Link>
      )}
      {role === "Technician" && (
        <Link
          href="/my-tasks/completed"
          className={pathname.startsWith("/my-tasks/completed") ? "active" : ""}
        >
          <CircleCheck size={16} strokeWidth={2} aria-hidden />
          {technicianCompletedNavLabel()}
        </Link>
      )}
      {reportIssueLink.roles.includes(role) && (
        <Link
          href={reportIssueLink.href}
          className={pathname.startsWith(reportIssueLink.href) ? "active" : ""}
        >
          <ReportIssueIcon size={16} strokeWidth={2} aria-hidden />
          {reportIssueLink.label}
        </Link>
      )}
      {assetMgmtLink.roles.includes(role) && (
        <Link
          href={assetMgmtLink.href}
          className={pathname.startsWith(assetMgmtLink.href) ? "active" : ""}
        >
          <AssetMgmtIcon size={16} strokeWidth={2} aria-hidden />
          {assetMgmtLink.label}
        </Link>
      )}
    </nav>
  );
}
