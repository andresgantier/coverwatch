import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { NavLinks } from "./nav-links";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";

// Server parts of the app shell that depend on the signed-in user.
// Each one is rendered inside its own <Suspense> boundary in the layout.

export async function SidebarNav() {
  await connection();
  const user = await getCurrentUser();
  return <NavLinks role={user.role} />;
}

export async function MobileMenu() {
  await connection();
  const user = await getCurrentUser();
  return <MobileNav role={user.role} />;
}

export async function AccountMenu() {
  await connection();
  const user = await getCurrentUser();
  return <UserMenu fullName={user.fullName} email={user.email} role={user.role} />;
}
