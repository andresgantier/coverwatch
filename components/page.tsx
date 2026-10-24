import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import { Construction } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { rolesFor } from "@/lib/navigation";
import { Skeleton } from "@/components/ui/skeleton";

// Standard page: static title (part of the instant shell) and a role-checked body
// that streams in behind <Suspense>.
export function Page({
  href, title, description, children,
}: { href: string; title: string; description?: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      <Suspense fallback={<PageSkeleton />}>
        <RoleGate href={href}>{children}</RoleGate>
      </Suspense>
    </div>
  );
}

async function RoleGate({ href, children }: { href: string; children: ReactNode }) {
  await connection();
  await requireRole(rolesFor(href));
  return <>{children}</>;
}

export function PageSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

// Placeholder for sections that are built in a later phase.
export function ComingSoon({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
      <Construction className="size-8 text-muted-foreground" aria-hidden />
      <p className="max-w-md text-muted-foreground">{children}</p>
    </div>
  );
}
