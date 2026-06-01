import { Router } from "express";
import { bookingUpdateSchema } from "@zahira/shared";
import { asyncHandler } from "../../lib/async-handler.js";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import * as bookingsService from "./bookings.service.js";

export const bookingsRouter: Router = Router();

bookingsRouter.use(requireAuth);

bookingsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await bookingsService.list());
  }),
);

bookingsRouter.put(
  "/:id",
  validate(bookingUpdateSchema),
  asyncHandler(async (req, res) => {
    const booking = await bookingsService.update(req.params.id!, req.body);
    res.json({ success: true, booking_id: booking.id });
  }),
);
