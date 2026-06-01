import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import * as sessionsService from "./sessions.service.js";

export const sessionsRouter: Router = Router();

sessionsRouter.use(requireAuth);

sessionsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await sessionsService.listSessions(false));
  }),
);

sessionsRouter.get(
  "/active",
  asyncHandler(async (_req, res) => {
    res.json(await sessionsService.listSessions(true));
  }),
);

sessionsRouter.post(
  "/:id/close",
  asyncHandler(async (req, res) => {
    const session = await sessionsService.closeSession(req.params.id!);
    res.json({ success: true, session_id: session.id });
  }),
);
