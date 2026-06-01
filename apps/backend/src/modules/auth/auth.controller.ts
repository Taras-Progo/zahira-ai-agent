import { Router } from "express";
import { loginSchema } from "@zahira/shared";
import { asyncHandler } from "../../lib/async-handler.js";
import { unauthorized } from "../../lib/errors.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { loginRateLimit } from "../../middleware/rate-limit.js";
import { verifyRefreshToken } from "./jwt.js";
import * as authService from "./auth.service.js";

const REFRESH_COOKIE = "zahira_refresh";

export const authRouter: Router = Router();

authRouter.post(
  "/login",
  loginRateLimit,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as { email: string; password: string };
    const { result, refreshToken } = await authService.login(email, password);
    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json(result);
  }),
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw unauthorized("Refresh token ausente");
    let adminId: string;
    try {
      adminId = verifyRefreshToken(token).sub;
    } catch {
      throw unauthorized("Refresh token inválido");
    }
    const accessToken = await authService.refresh(adminId);
    res.json({ token: accessToken });
  }),
);

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(REFRESH_COOKIE);
  res.json({ success: true });
});

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const admin = await authService.me(req.admin!.id);
    res.json({ admin });
  }),
);
