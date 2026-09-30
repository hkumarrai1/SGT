import Profile from "../models/Profile.js";
import Verification from "../models/Verification.js";
import LivePhoto from "../models/LivePhoto.js";
import VerificationApplication from "../models/VerificationApplication.js";

export async function getAuthoritativeStatus(userId) {
  const profile = await Profile.findOne({ userId })
    .populate("institutionId", "name shortName city")
    .lean();
  const collegeId = await Verification.findOne({ userId })
    .select("verificationStatus rejectionReason uploadedAt")
    .lean();
  const livePhoto = await LivePhoto.findOne({ userId })
    .select("status capturedAt")
    .lean();
  const application = await VerificationApplication.findOne({ userId })
    .select("verificationStatus submittedAt reviewedAt rejectionReason")
    .lean();
  const verificationStatus =
    application?.verificationStatus ||
    profile?.verificationStatus ||
    "NOT_SUBMITTED";
  const questionnaireStatus = profile?.questionnaireStatus || "NOT_STARTED";
  const completeBasic = Boolean(
    profile?.institutionId &&
    profile.fullName &&
    profile.dateOfBirth &&
    profile.gender &&
    profile.course &&
    profile.academicYear &&
    profile.studentId,
  );
  const completePhoto = Boolean(profile?.profilePhoto?.publicId);
  const completeLive = Boolean(livePhoto?.status);

  let nextStep = "COLLEGE";
  if (!profile?.institutionId) nextStep = "COLLEGE";
  else if (!completeBasic) nextStep = "PROFILE";
  else if (!completePhoto) nextStep = "PROFILE_PHOTO";
  else if (
    !collegeId?.verificationStatus ||
    collegeId.verificationStatus === "REJECTED"
  )
    nextStep = "COLLEGE_ID";
  else if (!completeLive) nextStep = "LIVE_PHOTO";
  else if (verificationStatus === "PENDING") nextStep = "VERIFICATION_PENDING";
  else if (verificationStatus === "REJECTED") nextStep = "RETRY_VERIFICATION";
  else if (
    verificationStatus === "VERIFIED" &&
    questionnaireStatus !== "COMPLETED"
  )
    nextStep = "QUESTIONNAIRE";
  else if (
    verificationStatus === "VERIFIED" &&
    questionnaireStatus === "COMPLETED"
  )
    nextStep = "DASHBOARD";
  else nextStep = "REVIEW";

  return {
    profile,
    collegeId,
    livePhoto,
    application,
    verificationStatus,
    questionnaireStatus,
    activePlan: profile?.activePlan || "none",
    paymentStatus: profile?.paymentStatus || "UNPAID",
    completeBasic,
    completePhoto,
    completeLive,
    nextStep,
  };
}
