import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import type { UserRole, UserStatus } from "@/lib/generated/prisma/client";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";
const COOKIE_NAME = "aiq_token";

export interface JWTPayload {
  userId: string;
  enterpriseId: string;
  role: UserRole;
  status: UserStatus;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getSessionUser() {
  const session = await getSession();
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      loginAccount: true,
      role: true,
      status: true,
      enterpriseId: true,
      teamId: true,
      positionTag: true,
      mustChangePassword: true,
      enterprise: { select: { id: true, name: true } },
      team: { select: { id: true, name: true } },
    },
  });
}

export const COOKIE_NAME_EXPORT = COOKIE_NAME;
export { COOKIE_NAME };
