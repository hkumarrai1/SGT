import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { receiveLivePhoto } from "../middleware/livePhotoUpload.js";
import {
  connectLivePhotoMobile,
  createLivePhotoSession,
  getLivePhotoSessionStatus,
  submitLaptopLivePhoto,
  submitMobileLivePhoto,
} from "../controllers/liveVerificationController.js";

const router = Router();

router.post(
  "/live-photo",
  requireAuth,
  receiveLivePhoto,
  submitLaptopLivePhoto,
);
router.post("/live-session", requireAuth, createLivePhotoSession);
router.post("/live-session/connect", connectLivePhotoMobile);
router.get(
  "/live-session/:sessionId/status",
  requireAuth,
  getLivePhotoSessionStatus,
);
router.post("/live-photo/mobile", receiveLivePhoto, submitMobileLivePhoto);

export default router;
