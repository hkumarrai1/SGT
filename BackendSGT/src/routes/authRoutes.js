import { Router } from "express";
import {
  getCurrentUser,
  logout,
  requestLoginOtp,
  requestSignupOtp,
  verifyLoginOtp,
  verifySignupOtp,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { otpEmailLimiter, otpIpLimiter } from "../middleware/rateLimiter.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();
const otpRequestLimiters = [otpIpLimiter, otpEmailLimiter];

router.post(
  "/signup/request-otp",
  otpRequestLimiters,
  asyncHandler(requestSignupOtp),
);
router.post("/signup/verify-otp", asyncHandler(verifySignupOtp));
router.post(
  "/login/request-otp",
  otpRequestLimiters,
  asyncHandler(requestLoginOtp),
);
router.post("/login/verify-otp", asyncHandler(verifyLoginOtp));
router.post("/logout", requireAuth, asyncHandler(logout));
router.get("/me", requireAuth, asyncHandler(getCurrentUser));

export default router;
