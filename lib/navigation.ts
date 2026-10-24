import type { Role } from "@/lib/roles";

export type NavItem = {
  href: string;
  label: string;
  roles: readonly Role[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

const STAFF: readonly Role[] = ["manager", "coordinator", "viewer"];

// Single source of truth for the menu and for page access.
export const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", roles: STAFF },
      { href: "/alerts", label: "Alerts", roles: STAFF },
      { href: "/my-work", label: "My work", roles: ["technician"] },
    ],
  },
  {
    label: "Contracts",
    items: [
      { href: "/contracts", label: "Contracts", roles: STAFF },
      { href: "/renewals", label: "Renewals", roles: STAFF },
    ],
  },
  {
    label: "Service",
    items: [
      { href: "/service-requests", label: "Service requests", roles: STAFF },
      { href: "/visits", label: "Preventive visits", roles: STAFF },
    ],
  },
  {
    label: "Master data",
    items: [
      { href: "/customers", label: "Customers", roles: STAFF },
      { href: "/equipment", label: "Equipment", roles: STAFF },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/continuity", label: "Continuity", roles: STAFF },
      { href: "/users", label: "Users", roles: ["manager"] },
    ],
  },
];

export function navFor(role: Role): NavGroup[] {
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) })).filter(
    (g) => g.items.length > 0,
  );
}

export function rolesFor(href: string): readonly Role[] {
  const item = NAV.flatMap((g) => g.items).find((i) => i.href === href);
  if (!item) throw new Error(`No navigation entry for ${href}`);
  return item.roles;
}
