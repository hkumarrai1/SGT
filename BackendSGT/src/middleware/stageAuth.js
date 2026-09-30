import Profile from "../models/Profile.js";

async function getProfile(req) {
  return Profile.findOne({ userId: req.user._id }).select(
    "verificationStatus questionnaireStatus",
  );
}

export async function requireVerified(req, res, next) {
  const profile = await getProfile(req);
  if (profile?.verificationStatus !== "VERIFIED")
    return res
      .status(403)
      .json({ success: false, message: "Verification approval is required." });
  next();
}

export async function requireDashboardAccess(req, res, next) {
  const profile = await getProfile(req);
  if (
    profile?.verificationStatus !== "VERIFIED" ||
    profile?.questionnaireStatus !== "COMPLETED"
  )
    return res
      .status(403)
      .json({
        success: false,
        message: "Complete verification and questionnaire first.",
      });
  next();
}
