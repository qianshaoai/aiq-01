/**
 * 初始化超级管理员账号
 * 使用方式：pnpm tsx scripts/init-super-admin.ts
 *
 * 读取环境变量：
 *   SUPER_ADMIN_EMAIL    超级管理员邮箱
 *   SUPER_ADMIN_PASSWORD 超级管理员初始密码
 *   SUPER_ADMIN_NAME     超级管理员姓名（可选，默认 "超级管理员"）
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../lib/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const name = process.env.SUPER_ADMIN_NAME ?? "超级管理员";

  if (!email || !password) {
    console.error("❌ 请在 .env 中设置 SUPER_ADMIN_EMAIL 和 SUPER_ADMIN_PASSWORD");
    process.exit(1);
  }

  const existing = await prisma.superAdmin.findUnique({ where: { email } });
  if (existing) {
    console.log(`ℹ️  超级管理员已存在：${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.superAdmin.create({
    data: { email, passwordHash, name },
  });

  console.log(`✅ 超级管理员创建成功`);
  console.log(`   邮箱：${admin.email}`);
  console.log(`   姓名：${admin.name}`);
  console.log(`   登录入口：/super/login`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
