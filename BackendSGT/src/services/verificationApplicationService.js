import Profile from "../models/Profile.js";
import Verification from "../models/Verification.js";
import LivePhoto from "../models/LivePhoto.js";
import VerificationApplication from "../models/VerificationApplication.js";
import { getAuthoritativeStatus } from "./onboardingStatusService.js";

function invalid(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

export async function submitVerificationApplication(userId) {
  const state = await getAuthoritativeStatus(userId);
  if (
    !state.profile?.institutionId ||
    !state.completeBasic ||
    !state.completePhoto ||
    state.collegeId?.verificationStatus !== "PENDING" ||
    !state.completeLive
  ) {
    throw invalid(
      "Complete every onboarding verification step before submitting.",
    );
  }
  if (state.application?.verificationStatus === "PENDING")
    return state.application;
  if (state.application?.verificationStatus === "VERIFIED")
    throw invalid("Your application is already verified.");

  const application = await VerificationApplication.findOneAndUpdate(
    { userId },
    {
      $set: {
        institutionId: state.profile.institutionId._id,
        verificationStatus: "PENDING",
        submittedAt: new Date(),
        rejectionReason: undefined,
        reviewedAt: undefined,
        reviewerId: undefined,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  await Profile.updateOne(
    { userId },
    { $set: { verificationStatus: "PENDING", onboardingStatus: "COMPLETED" } },
  );
  return application;
}

export async function getReviewSummary(userId) {
  const state = await getAuthoritativeStatus(userId);
  return {
    institution: state.profile?.institutionId,
    profile: state.profile
      ? {
          fullName: state.profile.fullName,
          dateOfBirth: state.profile.dateOfBirth,
          gender: state.profile.gender,
          course: state.profile.course,
          academicYear: state.profile.academicYear,
          studentId: state.profile.studentId,
        }
      : null,
    profilePhoto: state.profile?.profilePhoto
      ? { secureUrl: state.profile.profilePhoto.secureUrl }
      : null,
    collegeIdUploaded:
      state.collegeId?.verificationStatus === "PENDING" ||
      state.collegeId?.verificationStatus === "VERIFIED",
    livePhotoCaptured: Boolean(state.livePhoto),
    verificationStatus: state.verificationStatus,
    questionnaireStatus: state.questionnaireStatus,
    nextStep: state.nextStep,
  };
}
