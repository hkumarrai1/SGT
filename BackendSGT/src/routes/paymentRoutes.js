import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { receivePaymentScreenshot } from "../middleware/paymentUpload.js";
import {
  getPaymentStatus,
  listPlans,
  submitPayment,
} from "../controllers/paymentController.js";

const router = Router();

router.get("/plans", asyncHandler(listPlans));
router.get("/my-payment", requireAuth, asyncHandler(getPaymentStatus));
router.get("/status", requireAuth, asyncHandler(getPaymentStatus));
router.post(
  "/submit",
  requireAuth,
  receivePaymentScreenshot,
  asyncHandler(submitPayment),
);

export default router;
