import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import * as analyticsService from "./analytics.service.js";

export const analyticsRouter: Router = Router();

analyticsRouter.use(requireAuth);

analyticsRouter.get(
  "/dashboard",
  asyncHandler(async (_req, res) => {
    res.json(await analyticsService.dashboard());
  }),
);
