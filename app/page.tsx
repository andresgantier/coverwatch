import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { homeFor } from "@/lib/roles";

// "/" sends each user to the home page of their role.
export default function Home() {
  return (
    <Suspense fallback={null}>
      <RedirectHome />
    </Suspense>
  );
}

async function RedirectHome() {
  await connection();
  const user = await getCurrentUser();
  redirect(homeFor(user.role));
  return null;
}
