import sharp from "sharp";
import cloudinary from "../config/cloudinary.js";
import Institution from "../models/Institution.js";
import LivePhoto from "../models/LivePhoto.js";
import Profile from "../models/Profile.js";
import Verification from "../models/Verification.js";

const MAX_BYTES = 5 * 1024 * 1024;
const LIVE_PHOTO_FOLDER = "SGT/verification/live-photos";

function invalid(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function inspectLivePhoto(file) {
  if (!file?.buffer?.length)
    throw invalid("A camera-captured Live Photo is required.");
  if (file.buffer.length > MAX_BYTES)
    throw invalid("Live Photo must be 5 MB or smaller.", 413);
  let metadata;
  try {
    metadata = await sharp(file.buffer).metadata();
  } catch {
    throw invalid("The Live Photo is not a readable image.");
  }
  if (!["jpeg", "png", "webp"].includes(metadata.format))
    throw invalid("Use a valid camera image in JPG, PNG, or WebP format.");
  if (
    !metadata.width ||
    !metadata.height ||
    metadata.width < 300 ||
    metadata.height < 300
  )
    throw invalid("Live Photo must be at least 300 by 300 pixels.");
  if (metadata.width > 10000 || metadata.height > 10000)
    throw invalid("Live Photo dimensions are too large.");
  return metadata;
}

function uploadPrivateLivePhoto(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: LIVE_PHOTO_FOLDER, resource_type: "image", type: "private" },
      (error, result) => (error ? reject(error) : resolve(result)),
    );
    stream.end(buffer);
  });
}

async function deletePrivateLivePhoto(publicId) {
  if (publicId)
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      type: "private",
    });
}

async function ensureReady(userId) {
  const profile = await Profile.findOne({ userId });
  if (!profile?.institutionId)
    throw invalid("Complete institution selection first.");
  const collegeId = await Verification.findOne({
    userId,
    verificationStatus: { $in: ["PENDING", "VERIFIED"] },
  }).select("_id");
  if (!collegeId)
    throw invalid("Submit your College ID before taking a Live Photo.");
  const institution = await Institution.findOne({
    _id: profile.institutionId,
    active: true,
  }).select("_id");
  if (!institution) throw invalid("Your selected institution is not active.");
  return { profile, institution };
}

export async function saveLaptopLivePhoto(userId, file) {
  return saveLivePhoto(userId, file, "LAPTOP_CAMERA");
}

export async function saveMobileLivePhoto(session, file) {
  const { profile } = await ensureReady(session.userId);
  const saved = await saveLivePhoto(
    session.userId,
    file,
    "MOBILE_CAMERA",
    session.sessionId,
  );
  session.status = "COMPLETED";
  session.usedAt = new Date();
  await session.save();
  return { ...saved, profileId: profile._id };
}

async function saveLivePhoto(
  userId,
  file,
  submittedVia,
  sessionId = undefined,
) {
  const metadata = await inspectLivePhoto(file);
  const { profile, institution } = await ensureReady(userId);
  const previous = await LivePhoto.findOne({ userId });
  const uploaded = await uploadPrivateLivePhoto(file.buffer);
  const next = {
    userId,
    institutionId: institution._id,
    sessionId,
    cloudinaryPublicId: uploaded.public_id,
    cloudinaryAssetId: uploaded.asset_id,
    resourceType: "image",
    deliveryType: "private",
    verificationType: "LIVE_PHOTO",
    status: "PENDING",
    capturedAt: new Date(),
    submittedVia,
    fileFormat: metadata.format,
    fileBytes: file.buffer.length,
    width: metadata.width,
    height: metadata.height,
  };

  try {
    await LivePhoto.findOneAndUpdate(
      { userId },
      { $set: next },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );
    if (
      [
        "COLLEGE_PENDING",
        "PROFILE_PENDING",
        "PROFILE_COMPLETED",
        "TRAITS_COMPLETED",
        "PROFILE_PHOTO_COMPLETED",
        "COLLEGE_ID_SUBMITTED",
      ].includes(profile.onboardingStatus)
    ) {
      profile.onboardingStatus = "LIVE_PHOTO_SUBMITTED";
      await profile.save();
    }
  } catch (error) {
    try {
      await deletePrivateLivePhoto(uploaded.public_id);
    } catch (cleanupError) {
      console.error("Live Photo rollback failed", cleanupError);
    }
    throw error;
  }

  if (
    previous?.cloudinaryPublicId &&
    previous.cloudinaryPublicId !== uploaded.public_id
  ) {
    try {
      await deletePrivateLivePhoto(previous.cloudinaryPublicId);
    } catch (error) {
      console.error("Previous Live Photo cleanup failed", error);
    }
  }

  return { status: "PENDING", capturedAt: next.capturedAt };
}
