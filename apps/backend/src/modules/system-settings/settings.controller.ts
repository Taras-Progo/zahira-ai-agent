import { Router } from "express";
import { settingsUpdateSchema } from "@zahira/shared";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import * as settingsService from "./settings.service.js";

export const settingsRouter: Router = Router();

settingsRouter.use(requireAuth);

settingsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await settingsService.getSettings());
  }),
);

settingsRouter.put(
  "/",
  validate(settingsUpdateSchema),
  asyncHandler(async (req, res) => {
    const updated = await settingsService.updateSettings(
      req.body as Record<string, unknown>,
    );
    res.json(updated);
  }),
);
