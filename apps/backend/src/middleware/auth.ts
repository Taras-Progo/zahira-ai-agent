import type { NextFunction, Request, Response } from "express";
import { unauthorized } from "../lib/errors.js";
import { verifyAccessToken } from "../modules/auth/jwt.js";

export interface AuthedAdmin {
  id: string;
  email: string;
  role: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AuthedAdmin;
    }
  }
}

/** Requires a valid admin access token (Bearer). */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(unauthorized("Token de acesso ausente"));
    return;
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.admin = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    next(unauthorized("Token inválido ou expirado"));
  }
}

/** Optionally attaches admin if a valid token is present, never blocks. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = verifyAccessToken(header.slice("Bearer ".length));
      req.admin = { id: payload.sub, email: payload.email, role: payload.role };
    } catch {
      /* ignore invalid token for optional auth */
    }
  }
  next();
}
