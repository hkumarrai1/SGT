import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  getReview,
  getStatus,
  submitApplication,
} from "../controllers/verificationController.js";

const router = Router();
router.get("/status", requireAuth, asyncHandler(getStatus));
router.get("/review", requireAuth, asyncHandler(getReview));
router.post("/submit", requireAuth, asyncHandler(submitApplication));
export default router;
