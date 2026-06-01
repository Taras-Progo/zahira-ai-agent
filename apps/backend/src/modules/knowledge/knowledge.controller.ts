import { Router } from "express";
import { knowledgeInputSchema, knowledgeUpdateSchema } from "@zahira/shared";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import * as knowledgeService from "./knowledge.service.js";

export const knowledgeRouter: Router = Router();

knowledgeRouter.use(requireAuth);

knowledgeRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await knowledgeService.list());
  }),
);

knowledgeRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await knowledgeService.getById(req.params.id!));
  }),
);

knowledgeRouter.post(
  "/",
  validate(knowledgeInputSchema),
  asyncHandler(async (req, res) => {
    const entry = await knowledgeService.create(req.body);
    res.status(201).json({ success: true, id: entry.id, entry });
  }),
);

knowledgeRouter.put(
  "/:id",
  validate(knowledgeUpdateSchema),
  asyncHandler(async (req, res) => {
    const entry = await knowledgeService.update(req.params.id!, req.body);
    res.json({ success: true, entry });
  }),
);

knowledgeRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await knowledgeService.remove(req.params.id!);
    res.json({ success: true });
  }),
);
