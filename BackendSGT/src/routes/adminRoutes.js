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
import {
  blockUser,
  blockUserByEmail,
  createManualPair,
  getCandidatePartners,
  getDualGenderPool,
  listMatches,
  listStudentsForManualPair,
  listSuspendedUsers,
  nullifyMatch,
  unblockUser,
  unblockUserByEmail,
  unpairMatch,
} from "../controllers/adminMatchController.js";
import {
  createInfluencer,
  createOfferCode,
  deleteOfferCode,
  getInfluencerConversions,
  getOfferCodeConversions,
  listInfluencers,
  listOfferCodes,
  previewUniqueCode,
  previewUniqueOfferCode,
  toggleInfluencerStatus,
  toggleOfferCodeStatus,
} from "../controllers/promoCodeController.js";

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

// Dandiya Match & Pair Management Endpoints
router.get("/matches", requireAdmin, asyncHandler(listMatches));
router.get("/matches/dual-pool", requireAdmin, asyncHandler(getDualGenderPool));
router.get(
  "/matches/students",
  requireAdmin,
  asyncHandler(listStudentsForManualPair),
);
router.get(
  "/matches/candidates/:userId",
  requireAdmin,
  asyncHandler(getCandidatePartners),
);
router.post(
  "/matches/manual-pair",
  requireAdmin,
  asyncHandler(createManualPair),
);
router.patch(
  "/matches/:matchId/nullify",
  requireAdmin,
  asyncHandler(nullifyMatch),
);
router.patch(
  "/matches/:matchId/unpair",
  requireAdmin,
  asyncHandler(unpairMatch),
);

// User Suspension / Blocking Endpoints
router.get("/users/suspended", requireAdmin, asyncHandler(listSuspendedUsers));
router.patch("/users/:userId/block", requireAdmin, asyncHandler(blockUser));
router.patch("/users/:userId/unblock", requireAdmin, asyncHandler(unblockUser));
router.post(
  "/users/block-by-email",
  requireAdmin,
  asyncHandler(blockUserByEmail),
);
router.post(
  "/users/unblock-by-email",
  requireAdmin,
  asyncHandler(unblockUserByEmail),
);

// Influencer & Promo Code Management Endpoints
router.get("/influencers", requireAdmin, asyncHandler(listInfluencers));
router.post("/influencers", requireAdmin, asyncHandler(createInfluencer));
router.get(
  "/influencers/generate-code",
  requireAdmin,
  asyncHandler(previewUniqueCode),
);
router.get(
  "/influencers/:influencerId/conversions",
  requireAdmin,
  asyncHandler(getInfluencerConversions),
);
router.patch(
  "/influencers/:influencerId/toggle-status",
  requireAdmin,
  asyncHandler(toggleInfluencerStatus),
);
router.delete(
  "/influencers/:influencerId",
  requireAdmin,
  asyncHandler(deleteOfferCode),
);

// Dedicated Offer Code Management Endpoints (Percentage up to 100%, usage limits)
router.get("/offer-codes", requireAdmin, asyncHandler(listOfferCodes));
router.post("/offer-codes", requireAdmin, asyncHandler(createOfferCode));
router.get(
  "/offer-codes/generate-code",
  requireAdmin,
  asyncHandler(previewUniqueOfferCode),
);
router.get(
  "/offer-codes/:id/conversions",
  requireAdmin,
  asyncHandler(getOfferCodeConversions),
);
router.patch(
  "/offer-codes/:id/toggle-status",
  requireAdmin,
  asyncHandler(toggleOfferCodeStatus),
);
router.delete(
  "/offer-codes/:id",
  requireAdmin,
  asyncHandler(deleteOfferCode),
);

export default router;
