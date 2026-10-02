import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { receivePaymentScreenshot } from "../middleware/paymentUpload.js";
import {
  getPaymentStatus,
  listPlans,
  submitPayment,
} from "../controllers/paymentController.js";
import { validatePromoCode } from "../controllers/promoCodeController.js";

const router = Router();

router.get("/plans", asyncHandler(listPlans));
router.post("/validate-promo", asyncHandler(validatePromoCode));
router.get("/my-payment", requireAuth, asyncHandler(getPaymentStatus));
router.get("/status", requireAuth, asyncHandler(getPaymentStatus));
router.post(
  "/submit",
  requireAuth,
  receivePaymentScreenshot,
  asyncHandler(submitPayment),
);

export default router;
