import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AssetsShell } from "@/components/assets/assets-shell";

export default async function AssetsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <Suspense>
      <AssetsShell />
    </Suspense>
  );
}
