import { UserRole } from "@prisma/client";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
