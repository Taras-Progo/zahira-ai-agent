import { Router } from "express";
import { handoffUpdateSchema } from "@zahira/shared";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import * as handoffService from "./handoff.service.js";

export const supportRouter: Router = Router();

supportRouter.use(requireAuth);

supportRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await handoffService.list());
  }),
);

supportRouter.put(
  "/:id",
  validate(handoffUpdateSchema),
  asyncHandler(async (req, res) => {
    const handoff = await handoffService.update(req.params.id!, req.body);
    res.json({ success: true, handoff_id: handoff.id });
  }),
);
