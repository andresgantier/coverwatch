// Roles as defined in the database (public.user_role).
export const ROLES = ["manager", "coordinator", "technician", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  manager: "Service manager",
  coordinator: "Coordinator",
  technician: "Technician",
  viewer: "Viewer (read-only)",
};

// Where each role lands after signing in.
export function homeFor(role: Role) {
  return role === "technician" ? "/my-work" : "/dashboard";
}
