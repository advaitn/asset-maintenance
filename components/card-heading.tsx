import type { LucideIcon } from "lucide-react";

export function CardHeading({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <h2 className="card-heading">
      <Icon className="card-heading-icon" size={18} strokeWidth={2} aria-hidden />
      {children}
    </h2>
  );
}
