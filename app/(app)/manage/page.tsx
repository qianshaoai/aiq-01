import { redirect } from "next/navigation";

// 管理端已迁移至各角色独立后台
export default function ManagePage() {
  redirect("/manager/dashboard");
}
