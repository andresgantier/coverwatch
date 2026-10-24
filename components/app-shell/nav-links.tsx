"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell, Building2, CalendarCheck, ClipboardList, FileText, LayoutDashboard, RefreshCw, Users, Wrench, AirVent,
  type LucideIcon,
} from "lucide-react";
import { navFor } from "@/lib/navigation";
import type { Role } from "@/lib/roles";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/alerts": Bell,
  "/my-work": ClipboardList,
  "/contracts": FileText,
  "/renewals": RefreshCw,
  "/service-requests": Wrench,
  "/visits": CalendarCheck,
  "/customers": Building2,
  "/equipment": AirVent,
  "/users": Users,
};

// Menu filtered by role. Uses usePathname, so it must render inside <Suspense>.
export function NavLinks({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-5">
      {navFor(role).map((group) => (
        <div key={group.label} className="space-y-1">
          <p className="px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{group.label}</p>
          {group.items.map((item) => {
            const Icon = ICONS[item.href] ?? FileText;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function NavSkeleton() {
  return (
    <div className="space-y-3 px-3" aria-hidden>
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="h-7 animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  );
}
