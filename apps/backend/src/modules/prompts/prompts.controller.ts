import { Router } from "express";
import { promptRollbackSchema, promptUpdateSchema } from "@zahira/shared";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import * as promptsService from "./prompts.service.js";

export const promptsRouter: Router = Router();

promptsRouter.use(requireAuth);

promptsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await promptsService.listPrompts());
  }),
);

promptsRouter.get(
  "/:id/versions",
  asyncHandler(async (req, res) => {
    res.json(await promptsService.listVersions(req.params.id!));
  }),
);

promptsRouter.put(
  "/:id",
  validate(promptUpdateSchema),
  asyncHandler(async (req, res) => {
    const { content } = req.body as { content: string };
    const version = await promptsService.updateContent(
      req.params.id!,
      content,
      req.admin!.id,
    );
    res.json({ success: true, version: version.version });
  }),
);

promptsRouter.post(
  "/:id/rollback",
  validate(promptRollbackSchema),
  asyncHandler(async (req, res) => {
    const { versionId } = req.body as { versionId: string };
    const version = await promptsService.rollback(req.params.id!, versionId);
    res.json({ success: true, version: version.version });
  }),
);
