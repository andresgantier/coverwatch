import type { Metadata } from "next";
import { connection } from "next/server";
import { Page } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS, type Role } from "@/lib/roles";

export const metadata: Metadata = { title: "Users" };

export default function UsersPage() {
  return (
    <Page href="/users" title="Users" description="Team members and their roles. Roles decide what each person can see and change.">
      <UserList />
    </Page>
  );
}

async function UserList() {
  await connection();
  const supabase = await createClient();
  const { data: users, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, is_active")
    .order("role")
    .order("full_name");

  if (error) throw new Error(error.message);

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-4 py-2 font-medium">Email</th>
            <th className="px-4 py-2 font-medium">Role</th>
            <th className="px-4 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t">
              <td className="px-4 py-2 font-medium">{u.full_name}</td>
              <td className="px-4 py-2 text-muted-foreground">{u.email}</td>
              <td className="px-4 py-2">{ROLE_LABELS[u.role as Role]}</td>
              <td className="px-4 py-2">
                <Badge variant={u.is_active ? "secondary" : "outline"}>{u.is_active ? "Active" : "Inactive"}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
