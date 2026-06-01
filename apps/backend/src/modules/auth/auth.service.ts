import bcrypt from "bcryptjs";
import type { LoginResponse } from "@zahira/types";
import { prisma } from "../../lib/prisma.js";
import { unauthorized } from "../../lib/errors.js";
import { signAccessToken, signRefreshToken } from "./jwt.js";

export async function login(
  email: string,
  password: string,
): Promise<{ result: LoginResponse; refreshToken: string }> {
  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) throw unauthorized("Credenciais inválidas");

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) throw unauthorized("Credenciais inválidas");

  const token = signAccessToken({
    sub: admin.id,
    email: admin.email,
    role: admin.role,
  });
  const refreshToken = signRefreshToken(admin.id);

  return {
    result: {
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    },
    refreshToken,
  };
}

export async function refresh(adminId: string): Promise<string> {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) throw unauthorized("Sessão inválida");
  return signAccessToken({
    sub: admin.id,
    email: admin.email,
    role: admin.role,
  });
}

export async function me(adminId: string) {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) throw unauthorized("Sessão inválida");
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
