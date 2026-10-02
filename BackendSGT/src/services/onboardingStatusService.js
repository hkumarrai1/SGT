import Profile from "../models/Profile.js";
import Verification from "../models/Verification.js";
import LivePhoto from "../models/LivePhoto.js";
import VerificationApplication from "../models/VerificationApplication.js";
import { generateAnonymousAlias } from "../utils/aliasGenerator.js";

export async function getAuthoritativeStatus(userId) {
  let profile = await Profile.findOne({ userId })
    .populate("institutionId", "name shortName city")
    .lean();

  if (profile && !profile.anonymousAlias) {
    const alias = generateAnonymousAlias();
    await Profile.updateOne({ userId }, { $set: { anonymousAlias: alias } });
    profile.anonymousAlias = alias;
  }
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
  const completeTraits = Boolean(
    profile?.personalityTraits &&
    (profile.personalityTraits.height ||
     profile.personalityTraits.dandiyaSkill ||
     profile.personalityTraits.socialBattery ||
     profile.personalityTraits.musicTaste ||
     profile.personalityTraits.partnerVibe ||
     profile.onboardingStatus === "TRAITS_COMPLETED" ||
     [
       "TRAITS_COMPLETED",
       "PROFILE_PHOTO_COMPLETED",
       "COLLEGE_ID_SUBMITTED",
       "LIVE_PHOTO_SUBMITTED",
       "COMPLETED",
     ].includes(profile.onboardingStatus))
  );
  const completePhoto = Boolean(profile?.profilePhoto?.publicId);
  const completeLive = Boolean(livePhoto?.status);

  let nextStep = "COLLEGE";
  if (!profile?.institutionId) nextStep = "COLLEGE";
  else if (!completeBasic) nextStep = "PROFILE";
  else if (!completeTraits) nextStep = "TRAITS";
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
    completeTraits,
    completePhoto,
    completeLive,
    nextStep,
  };
}
