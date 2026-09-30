import VerificationApplication from "../models/VerificationApplication.js";
import Profile from "../models/Profile.js";
import Institution from "../models/Institution.js";
import Verification from "../models/Verification.js";
import LivePhoto from "../models/LivePhoto.js";
import { getAuthoritativeStatus } from "../services/onboardingStatusService.js";
import {
  getReviewSummary,
  submitVerificationApplication,
} from "../services/verificationApplicationService.js";
import cloudinary from "../config/cloudinary.js";

export async function getStatus(req, res) {
  return res.json({
    success: true,
    onboarding: await getAuthoritativeStatus(req.user._id),
  });
}
export async function getReview(req, res) {
  return res.json({
    success: true,
    review: await getReviewSummary(req.user._id),
  });
}
export async function submitApplication(req, res) {
  const application = await submitVerificationApplication(req.user._id);
  return res.json({
    success: true,
    message: "Application submitted for review.",
    verificationStatus: application.verificationStatus,
    nextStep: "VERIFICATION_PENDING",
  });
}

export async function listApplications(req, res) {
  const applications = await VerificationApplication.find({
    verificationStatus: req.query.status || "PENDING",
  })
    .populate("userId", "email")
    .populate("institutionId", "name city")
    .sort({ submittedAt: 1 })
    .lean();
  return res.json({ success: true, applications });
}

function signedPrivateUrl(cloudinary, publicId) {
  return cloudinary.url(publicId, {
    type: "private",
    resource_type: "image",
    sign_url: true,
    secure: true,
  });
}

export async function getApplicationDetail(req, res) {
  const application = await VerificationApplication.findById(
    req.params.verificationId,
  )
    .populate("userId", "email")
    .populate("institutionId", "name city")
    .lean();
  if (!application)
    return res
      .status(404)
      .json({ success: false, message: "Verification application not found." });
  const profile = await Profile.findOne({
    userId: application.userId._id,
  }).lean();
  const collegeId = await Verification.findOne({
    userId: application.userId._id,
  }).lean();
  const livePhoto = await LivePhoto.findOne({
    userId: application.userId._id,
  }).lean();
  return res.json({
    success: true,
    application,
    profile: { ...profile, profilePhoto: profile?.profilePhoto?.secureUrl },
    privateDocuments: {
      collegeIdUrl: collegeId
        ? signedPrivateUrl(cloudinary, collegeId.cloudinaryPublicId)
        : null,
      livePhotoUrl: livePhoto
        ? signedPrivateUrl(cloudinary, livePhoto.cloudinaryPublicId)
        : null,
    },
  });
}

export async function approveApplication(req, res) {
  return changeApplication(req, res, "VERIFIED");
}
export async function rejectApplication(req, res) {
  return changeApplication(req, res, "REJECTED");
}
async function changeApplication(req, res, status) {
  const application = await VerificationApplication.findById(
    req.params.verificationId,
  );
  if (!application)
    return res
      .status(404)
      .json({ success: false, message: "Verification application not found." });
  if (application.verificationStatus === status) {
    return res.json({
      success: true,
      verificationStatus: status,
      message: `Application is already ${status.toLowerCase()}.`,
    });
  }
  if (application.verificationStatus !== "PENDING")
    return res.status(409).json({
      success: false,
      message: `Cannot ${status.toLowerCase()} an application that is already ${application.verificationStatus.toLowerCase()}.`,
    });
  application.verificationStatus = status;
  application.reviewedAt = new Date();
  application.reviewerId = req.admin.id;
  if (status === "REJECTED")
    application.rejectionReason =
      req.body?.reason?.trim() ||
      "Please review and resubmit your verification.";
  await application.save();
  await Verification.updateOne(
    { userId: application.userId },
    {
      $set: {
        verificationStatus: status,
        reviewedAt: application.reviewedAt,
        reviewerId: application.reviewerId,
        rejectionReason: application.rejectionReason,
      },
    },
  );
  await Profile.updateOne(
    { userId: application.userId },
    { $set: { verificationStatus: status } },
  );
  await LivePhoto.updateOne(
    { userId: application.userId },
    { $set: { status } },
  );
  return res.json({ success: true, verificationStatus: status });
}
