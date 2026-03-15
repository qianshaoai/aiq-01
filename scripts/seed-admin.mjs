import { PrismaClient } from "../lib/generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

// Load .env
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "../.env");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PASSWORD = "a13791097172";
const hash = bcrypt.hashSync(PASSWORD, 10);

const enterprise = await prisma.enterprise.upsert({
  where: { enterpriseCode: "SYSTEM" },
  update: {},
  create: { name: "系统管理", enterpriseCode: "SYSTEM" },
});
console.log("Enterprise:", enterprise.id, enterprise.name);

const user = await prisma.user.upsert({
  where: { loginAccount_enterpriseId: { loginAccount: "admin", enterpriseId: enterprise.id } },
  update: { passwordHash: hash, role: "ENTERPRISE_ADMIN", status: "ACTIVE" },
  create: {
    enterpriseId: enterprise.id,
    name: "系统管理员",
    loginAccount: "admin",
    passwordHash: hash,
    role: "ENTERPRISE_ADMIN",
    status: "ACTIVE",
  },
});
console.log("✓ User:", user.loginAccount, "|", user.role, "|", user.status);

await prisma.$disconnect();
