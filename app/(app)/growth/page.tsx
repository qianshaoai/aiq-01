import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { GrowthShell } from "@/components/growth/growth-shell";

export default async function GrowthPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <Suspense>
      <GrowthShell />
    </Suspense>
  );
}
