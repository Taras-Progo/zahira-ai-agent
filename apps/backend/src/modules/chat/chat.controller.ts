import { Router } from "express";
import { chatSchema } from "@zahira/shared";
import { asyncHandler } from "../../lib/async-handler.js";
import { validate } from "../../middleware/validate.js";
import { chatRateLimit } from "../../middleware/rate-limit.js";
import { webhookOrAdmin } from "../sendpulse/webhook-auth.js";
import { processChat } from "./chat.service.js";

export const chatRouter: Router = Router();

/**
 * POST /api/chat - the single AI conversation endpoint.
 * Used by both the SendPulse webhook and the admin AI Test Panel.
 */
chatRouter.post(
  "/",
  chatRateLimit,
  webhookOrAdmin,
  validate(chatSchema),
  asyncHandler(async (req, res) => {
    const response = await processChat(req.body);
    res.json(response);
  }),
);
