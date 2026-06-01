import type { NextFunction, Request, Response } from "express";
import { env } from "../../config/env.js";
import { unauthorized } from "../../lib/errors.js";
import { verifyAccessToken } from "../auth/jwt.js";

/**
 * Allows the chat endpoint to be called by either:
 *  - SendPulse (X-Webhook-Secret header), or
 *  - an authenticated admin (Bearer token, used by the AI Test Panel).
 */
export function webhookOrAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const secret = req.header("X-Webhook-Secret");
  if (secret && secret === env.SENDPULSE_WEBHOOK_SECRET) {
    next();
    return;
  }

  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = verifyAccessToken(header.slice("Bearer ".length));
      req.admin = { id: payload.sub, email: payload.email, role: payload.role };
      next();
      return;
    } catch {
      /* fall through */
    }
  }

  next(unauthorized("Credenciais de webhook inválidas"));
}
