import mongoose from "mongoose";
import Institution from "../models/Institution.js";
import Profile from "../models/Profile.js";
import {
  getProfileForUser,
  saveBasicProfile,
} from "../services/profileService.js";
import { saveProfilePhoto } from "../services/profilePhotoService.js";
import {
  getCollegeIdStatus,
  saveCollegeId,
} from "../services/verificationService.js";
import { getAuthoritativeStatus } from "../services/onboardingStatusService.js";

export async function getOnboardingStatus(req, res) {
  const state = await getAuthoritativeStatus(req.user._id);
  return res.json({
    success: true,
    onboarding: {
      institutionSelected: Boolean(state.profile?.institutionId),
      institution: state.profile?.institutionId || null,
      profileComplete: state.completeBasic,
      profilePhotoComplete: state.completePhoto,
      collegeIdStatus: state.collegeId?.verificationStatus || "NOT_UPLOADED",
      collegeIdRejectionReason: state.collegeId?.rejectionReason || null,
      livePhotoCaptured: state.completeLive,
      verificationStatus: state.verificationStatus,
      questionnaireStatus: state.questionnaireStatus,
      nextStep: state.nextStep,
      profile: state.completeBasic
        ? {
            fullName: state.profile.fullName,
            dateOfBirth: state.profile.dateOfBirth,
            gender: state.profile.gender,
            course: state.profile.course,
            academicYear: state.profile.academicYear,
            studentId: state.profile.studentId,
          }
        : null,
    },
  });
}

export async function getBasicProfile(req, res) {
  const profile = await getProfileForUser(req.user._id);
  if (!profile?.institutionId) {
    return res.status(400).json({
      success: false,
      message: "Select your institution before opening your profile.",
    });
  }

  return res.json({
    success: true,
    institution: profile.institutionId,
    profile: [
      "PROFILE_COMPLETED",
      "PROFILE_PHOTO_COMPLETED",
      "COLLEGE_ID_SUBMITTED",
      "LIVE_PHOTO_SUBMITTED",
      "COMPLETED",
    ].includes(profile.onboardingStatus)
      ? {
          fullName: profile.fullName,
          dateOfBirth: profile.dateOfBirth,
          gender: profile.gender,
          course: profile.course,
          academicYear: profile.academicYear,
          studentId: profile.studentId,
        }
      : null,
    profilePhoto: profile.profilePhoto || null,
  });
}

export async function saveBasicProfileDetails(req, res) {
  const profile = await saveBasicProfile(req.user._id, req.body);
  return res.json({
    success: true,
    message: "Basic profile saved.",
    nextStep: "profile-photo",
    institution: profile.institutionId,
  });
}

export async function uploadProfilePhoto(req, res) {
  const profilePhoto = await saveProfilePhoto(req.user._id, req.file);
  return res.json({
    success: true,
    message: "Profile photo saved.",
    profilePhoto,
    nextStep: "college-id",
  });
}

export async function uploadCollegeId(req, res) {
  const studentId = req.body?.studentId || req.body?.enrollmentNo;
  const verification = await saveCollegeId(req.user._id, req.file, studentId);
  return res.json({
    success: true,
    message: "College ID submitted for review.",
    verification,
    nextStep: "live-photo",
  });
}

export async function saveInstitution(req, res) {
  const { institutionId } = req.body || {};
  if (!mongoose.isValidObjectId(institutionId)) {
    return res
      .status(400)
      .json({ success: false, message: "Select a valid institution." });
  }

  const institution = await Institution.findOne({
    _id: institutionId,
    active: true,
  }).select("_id name shortName city");

  if (!institution) {
    return res.status(400).json({
      success: false,
      message: "Select an active institution from the available list.",
    });
  }

  const profile = await Profile.findOneAndUpdate(
    { userId: req.user._id },
    {
      $set: {
        institutionId: institution._id,
        onboardingStatus: "PROFILE_PENDING",
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).populate("institutionId", "name shortName city");

  return res.json({
    success: true,
    message: "Institution saved.",
    institution: profile.institutionId,
    nextStep: "profile-details",
  });
}
