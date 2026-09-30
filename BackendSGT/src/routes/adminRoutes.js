import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAdmin } from "../middleware/adminAuth.js";
import { adminLogin } from "../controllers/adminController.js";
import {
  approveApplication,
  getApplicationDetail,
  listApplications,
  rejectApplication,
} from "../controllers/verificationController.js";
import {
  approvePayment,
  getPaymentDetail,
  listPayments,
  rejectPayment,
} from "../controllers/adminPaymentController.js";

const router = Router();
router.post("/login", asyncHandler(adminLogin));
router.get("/verifications", requireAdmin, asyncHandler(listApplications));
router.get(
  "/verifications/:verificationId",
  requireAdmin,
  asyncHandler(getApplicationDetail),
);
router.patch(
  "/verifications/:verificationId/approve",
  requireAdmin,
  asyncHandler(approveApplication),
);
router.patch(
  "/verifications/:verificationId/reject",
  requireAdmin,
  asyncHandler(rejectApplication),
);

// Payment Management Endpoints
router.get("/payments", requireAdmin, asyncHandler(listPayments));
router.get("/payments/:paymentId", requireAdmin, asyncHandler(getPaymentDetail));
router.patch(
  "/payments/:paymentId/approve",
  requireAdmin,
  asyncHandler(approvePayment),
);
router.patch(
  "/payments/:paymentId/reject",
  requireAdmin,
  asyncHandler(rejectPayment),
);

export default router;
