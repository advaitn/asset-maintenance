import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type BreadcrumbItem = { href?: string; label: string };

export function BreadcrumbTrail({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="breadcrumb breadcrumb-icons" aria-label="Breadcrumb">
      {items.map((crumb, i) => (
        <span key={`${crumb.label}-${i}`} className="breadcrumb-segment">
          {i > 0 && <ChevronRight className="breadcrumb-chev" size={14} strokeWidth={2} aria-hidden />}
          {crumb.href ?
            <Link href={crumb.href}>{crumb.label}</Link>
          : <span className="breadcrumb-current">{crumb.label}</span>}
        </span>
      ))}
    </nav>
  );
}
