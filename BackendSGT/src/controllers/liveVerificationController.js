import {
  saveLaptopLivePhoto,
  saveMobileLivePhoto,
} from "../services/livePhotoService.js";
import {
  connectMobileSession,
  consumeMobileSession,
  createLiveSession,
  getOwnedSessionStatus,
} from "../services/liveSessionService.js";

export async function createLivePhotoSession(req, res) {
  const session = await createLiveSession(req.user._id);
  return res.status(201).json({ success: true, session });
}

export async function connectLivePhotoMobile(req, res) {
  const result = await connectMobileSession(req.query.t);
  return res.json({ success: true, session: result });
}

export async function getLivePhotoSessionStatus(req, res) {
  const status = await getOwnedSessionStatus(
    req.user._id,
    req.params.sessionId,
  );
  return res.json({ success: true, session: status });
}

export async function submitLaptopLivePhoto(req, res) {
  const livePhoto = await saveLaptopLivePhoto(req.user._id, req.file);
  return res.json({
    success: true,
    message: "Live Photo submitted for review.",
    livePhoto,
    nextStep: "complete",
  });
}

export async function submitMobileLivePhoto(req, res) {
  const session = await consumeMobileSession(req.query.t);
  const livePhoto = await saveMobileLivePhoto(session, req.file);
  return res.json({
    success: true,
    message: "Live Photo submitted for review.",
    livePhoto,
    nextStep: "complete",
  });
}
