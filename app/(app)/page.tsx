import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { HomeShell } from "@/components/home/home-shell";

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // 最近未完成任务（最多3条）
  const recentTasks = await prisma.task.findMany({
    where: {
      creatorUserId: user.id,
      status: { in: ["CREATED", "DEFINING", "PENDING_DIRECTION", "EXECUTING", "PENDING_DRAFT"] },
    },
    orderBy: { updatedAt: "desc" },
    take: 3,
    select: {
      id: true,
      title: true,
      summary: true,
      taskType: true,
      status: true,
      updatedAt: true,
    },
  });

  // 最新成长回执
  const latestReceipt = await prisma.growthReceipt.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      summaryOfCompletion: true,
      strengthSummary: true,
      nextActionSuggestion: true,
      createdAt: true,
    },
  });

  return (
    <HomeShell
      user={{
        id: user.id,
        name: user.name,
        role: user.role,
        status: user.status,
      }}
      recentTasks={recentTasks}
      latestReceipt={latestReceipt}
    />
  );
}
