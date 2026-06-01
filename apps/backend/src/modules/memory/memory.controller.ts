import { Router } from "express";
import { memoryInputSchema, memoryUpdateSchema } from "@zahira/shared";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import * as memoryService from "./memory.service.js";

export const memoryRouter: Router = Router();

memoryRouter.use(requireAuth);

memoryRouter.get(
  "/:userId",
  asyncHandler(async (req, res) => {
    res.json(await memoryService.getForUser(req.params.userId!));
  }),
);

memoryRouter.post(
  "/",
  validate(memoryInputSchema),
  asyncHandler(async (req, res) => {
    const memory = await memoryService.create(req.body);
    res.status(201).json({ success: true, memory });
  }),
);

memoryRouter.put(
  "/:id",
  validate(memoryUpdateSchema),
  asyncHandler(async (req, res) => {
    const memory = await memoryService.update(req.params.id!, req.body);
    res.json({ success: true, memory });
  }),
);

memoryRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await memoryService.remove(req.params.id!);
    res.json({ success: true });
  }),
);
