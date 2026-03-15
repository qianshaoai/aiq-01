import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { NotificationsShell } from "@/components/notifications/notifications-shell";

export default async function NotificationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <Suspense>
      <NotificationsShell />
    </Suspense>
  );
}
