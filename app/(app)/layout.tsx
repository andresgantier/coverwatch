import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { NavSkeleton } from "@/components/app-shell/nav-links";
import { AccountMenu, MobileMenu, SidebarNav } from "@/components/app-shell/shell-parts";

// Frame of every signed-in page: sidebar (desktop), top bar with menu button (mobile) and account menu.
// The frame is static; only the parts that depend on the user stream in.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
        <Link href="/" className="flex h-14 items-center border-b px-4">
          <Logo />
        </Link>
        <div className="flex-1 overflow-y-auto p-3">
          <Suspense fallback={<NavSkeleton />}>
            <SidebarNav />
          </Suspense>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
          <Suspense fallback={<Skeleton className="size-9 md:hidden" />}>
            <MobileMenu />
          </Suspense>
          <Link href="/" className="md:hidden">
            <Logo />
          </Link>
          <div className="ml-auto">
            <Suspense fallback={<Skeleton className="h-8 w-36" />}>
              <AccountMenu />
            </Suspense>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
