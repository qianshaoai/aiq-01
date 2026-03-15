import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { TrainingShell } from "@/components/training/training-shell";

export default async function TrainingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <Suspense>
      <TrainingShell />
    </Suspense>
  );
}
