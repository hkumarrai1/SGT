import { Router } from "express";
import {
  getBasicProfile,
  getOnboardingStatus,
  getTraits,
  saveBasicProfileDetails,
  saveInstitution,
  saveTraits,
  uploadCollegeId,
  uploadProfilePhoto,
} from "../controllers/profileController.js";
import { requireAuth } from "../middleware/auth.js";
import { receiveProfilePhoto } from "../middleware/profilePhotoUpload.js";
import { receiveCollegeId } from "../middleware/verificationUpload.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.get(
  "/onboarding/status",
  requireAuth,
  asyncHandler(getOnboardingStatus),
);
router.get("/profile", requireAuth, asyncHandler(getBasicProfile));
router.patch("/profile", requireAuth, asyncHandler(saveBasicProfileDetails));
router.get("/profile/traits", requireAuth, asyncHandler(getTraits));
router.patch("/profile/traits", requireAuth, asyncHandler(saveTraits));
router.post(
  "/profile/photo",
  requireAuth,
  receiveProfilePhoto,
  asyncHandler(uploadProfilePhoto),
);
router.post(
  "/verification/college-id",
  requireAuth,
  receiveCollegeId,
  asyncHandler(uploadCollegeId),
);
router.patch(
  "/profile/institution",
  requireAuth,
  asyncHandler(saveInstitution),
);

export default router;
