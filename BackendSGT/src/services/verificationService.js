import sharp from "sharp";
import cloudinary from "../config/cloudinary.js";
import Institution from "../models/Institution.js";
import Profile from "../models/Profile.js";
import Verification from "../models/Verification.js";

const MAX_BYTES = 10 * 1024 * 1024;
const VERIFICATION_FOLDER = "SGT/verification/college-ids";

function invalid(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function inspectCollegeId(file) {
  if (!file?.buffer?.length) throw invalid("College ID file is required.");
  if (file.buffer.length > MAX_BYTES)
    throw invalid("College ID must be 10 MB or smaller.", 413);

  let metadata;
  try {
    metadata = await sharp(file.buffer).metadata();
  } catch {
    throw invalid("The uploaded College ID is not a readable image.");
  }

  if (!["jpeg", "png"].includes(metadata.format))
    throw invalid("Use a JPG, JPEG, or PNG College ID image.");
  if (
    !metadata.width ||
    !metadata.height ||
    metadata.width < 300 ||
    metadata.height < 200
  ) {
    throw invalid("College ID image must be at least 300 by 200 pixels.");
  }
  if (metadata.width > 12000 || metadata.height > 12000)
    throw invalid("College ID image dimensions are too large.");

  return metadata;
}

function uploadPrivateDocument(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: VERIFICATION_FOLDER, resource_type: "image", type: "private" },
      (error, result) => (error ? reject(error) : resolve(result)),
    );
    stream.end(buffer);
  });
}

async function deletePrivateDocument(publicId) {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    type: "private",
  });
}

export async function getCollegeIdStatus(userId) {
  return Verification.findOne({ userId })
    .select("verificationStatus rejectionReason uploadedAt documentType")
    .lean();
}

export async function saveCollegeId(userId, file, studentId = null) {
  const metadata = await inspectCollegeId(file);
  const profile = await Profile.findOne({ userId });
  if (!profile?.institutionId)
    throw invalid(
      "Complete institution selection before uploading your College ID.",
    );
  if (
    profile.onboardingStatus !== "PROFILE_PHOTO_COMPLETED" &&
    profile.onboardingStatus !== "COLLEGE_ID_SUBMITTED"
  ) {
    throw invalid(
      "Complete your profile photo before uploading your College ID.",
    );
  }

  const institution = await Institution.findOne({
    _id: profile.institutionId,
    active: true,
  }).select("_id");
  if (!institution) throw invalid("Your selected institution is not active.");

  const previous = await Verification.findOne({ userId });
  if (previous?.verificationStatus === "VERIFIED")
    throw invalid("A verified College ID cannot be replaced.");

  const cleanStudentId = typeof studentId === "string" ? studentId.trim() : (profile.studentId || "");
  const uploaded = await uploadPrivateDocument(file.buffer);
  const nextMetadata = {
    userId,
    institutionId: institution._id,
    studentId: cleanStudentId,
    cloudinaryPublicId: uploaded.public_id,
    cloudinaryAssetId: uploaded.asset_id,
    resourceType: "image",
    deliveryType: "private",
    documentType: "college-id",
    fileFormat: metadata.format,
    fileBytes: file.buffer.length,
    width: metadata.width,
    height: metadata.height,
    uploadedAt: new Date(),
    verificationStatus: "PENDING",
    rejectionReason: undefined,
    reviewedAt: undefined,
    reviewerId: undefined,
  };

  try {
    await Verification.findOneAndUpdate(
      { userId },
      { $set: nextMetadata },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );
    profile.onboardingStatus = "COLLEGE_ID_SUBMITTED";
    if (cleanStudentId) {
      profile.studentId = cleanStudentId;
    }
    await profile.save();
  } catch (error) {
    try {
      await deletePrivateDocument(uploaded.public_id);
    } catch (cleanupError) {
      console.error("College ID Cloudinary rollback failed", cleanupError);
    }
    throw error;
  }

  if (
    previous?.cloudinaryPublicId &&
    previous.cloudinaryPublicId !== uploaded.public_id
  ) {
    try {
      await deletePrivateDocument(previous.cloudinaryPublicId);
    } catch (error) {
      console.error("Previous College ID cleanup failed", error);
    }
  }

  return { verificationStatus: "PENDING", uploadedAt: nextMetadata.uploadedAt };
}
