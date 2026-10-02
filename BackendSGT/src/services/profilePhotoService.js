import sharp from "sharp";
import cloudinary from "../config/cloudinary.js";
import Profile from "../models/Profile.js";

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);
const MAX_BYTES = 5 * 1024 * 1024;
const PROFILE_PHOTO_FOLDER = "SGT/profile-photos";

function invalid(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function inspectImage(file) {
  if (!file?.buffer?.length) throw invalid("Profile photo is required.");
  if (file.buffer.length > MAX_BYTES)
    throw invalid("Profile photo must be 5 MB or smaller.", 413);

  let metadata;
  try {
    metadata = await sharp(file.buffer).metadata();
  } catch {
    throw invalid("The uploaded file is not a readable image.");
  }

  if (!ALLOWED_FORMATS.has(metadata.format))
    throw invalid("Use a JPG, PNG, or WebP image.");
  if (
    !metadata.width ||
    !metadata.height ||
    metadata.width < 200 ||
    metadata.height < 200
  ) {
    throw invalid("Profile photo must be at least 200 by 200 pixels.");
  }
  if (metadata.width > 10000 || metadata.height > 10000)
    throw invalid("Profile photo dimensions are too large.");

  return metadata;
}

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: PROFILE_PHOTO_FOLDER, resource_type: "image", type: "upload" },
      (error, result) => (error ? reject(error) : resolve(result)),
    );
    stream.end(buffer);
  });
}

async function removeFromCloudinary(publicId) {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    type: "upload",
  });
}

export async function saveProfilePhoto(userId, file) {
  const metadata = await inspectImage(file);
  const profile = await Profile.findOne({ userId });
  if (!profile?.institutionId)
    throw invalid(
      "Complete institution selection before uploading a profile photo.",
    );
  if (!profile.fullName || !profile.studentId)
    throw invalid("Complete your basic profile before uploading a photo.");

  const previousPhoto =
    profile.profilePhoto?.toObject?.() || profile.profilePhoto;
  const uploaded = await uploadToCloudinary(file.buffer);
  const nextPhoto = {
    publicId: uploaded.public_id,
    url: uploaded.url,
    secureUrl: uploaded.secure_url,
    format: metadata.format,
    width: metadata.width,
    height: metadata.height,
    uploadedAt: new Date(),
  };

  try {
    profile.profilePhoto = nextPhoto;
    if (
      [
        "COLLEGE_PENDING",
        "PROFILE_PENDING",
        "PROFILE_COMPLETED",
        "TRAITS_COMPLETED",
        "PROFILE_PHOTO_COMPLETED",
      ].includes(profile.onboardingStatus)
    ) {
      profile.onboardingStatus = "PROFILE_PHOTO_COMPLETED";
    }
    await profile.save();
  } catch (error) {
    try {
      await removeFromCloudinary(uploaded.public_id);
    } catch (cleanupError) {
      console.error("Cloudinary rollback failed", cleanupError);
    }
    throw error;
  }

  if (
    previousPhoto?.publicId &&
    previousPhoto.publicId !== nextPhoto.publicId
  ) {
    try {
      await removeFromCloudinary(previousPhoto.publicId);
    } catch (error) {
      console.error("Previous profile photo cleanup failed", error);
    }
  }

  return nextPhoto;
}
