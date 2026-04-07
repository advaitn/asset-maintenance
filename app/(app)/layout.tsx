import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NavBar } from "./nav-bar";
import { userRoleLabel } from "@/lib/labels";
import { LogoutButton } from "@/components/logout-button";
import { UserRound, Wrench } from "lucide-react";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/");

  const user = session.user as { id: string; name: string; role: string };

  return (
    <>
      <header className="header">
        <h1>
          <Wrench className="header-mark" size={22} strokeWidth={2} aria-hidden />
          Asset Maintenance
        </h1>
        <div className="user-info">
          <span className="user-chip">
            <UserRound size={18} strokeWidth={2} aria-hidden />
            <span>
              {user.name} <span className="role-badge">({userRoleLabel(user.role)})</span>
            </span>
          </span>
          <LogoutButton />
        </div>
      </header>
      <NavBar role={user.role} />
      <main className="content">{children}</main>
    </>
  );
}
