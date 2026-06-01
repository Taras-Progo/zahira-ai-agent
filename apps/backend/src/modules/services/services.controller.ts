import { Router } from "express";
import { serviceInputSchema, serviceUpdateSchema } from "@zahira/shared";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import * as servicesService from "./services.service.js";

export const servicesRouter: Router = Router();

servicesRouter.use(requireAuth);

servicesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await servicesService.list());
  }),
);

servicesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await servicesService.getById(req.params.id!));
  }),
);

servicesRouter.post(
  "/",
  validate(serviceInputSchema),
  asyncHandler(async (req, res) => {
    const service = await servicesService.create(req.body);
    res.status(201).json({ success: true, service_id: service.id, service });
  }),
);

servicesRouter.put(
  "/:id",
  validate(serviceUpdateSchema),
  asyncHandler(async (req, res) => {
    const service = await servicesService.update(req.params.id!, req.body);
    res.json({ success: true, service });
  }),
);

servicesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await servicesService.remove(req.params.id!);
    res.json({ success: true });
  }),
);
