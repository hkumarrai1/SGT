import User from "../models/User.js";
import Profile from "../models/Profile.js";
import { sendOtpEmail } from "../services/emailService.js";
import {
  createAuthToken,
  createOrVerifyUser,
} from "../services/authService.js";
import { createOtp, verifyOtp } from "../services/otpService.js";
import { created, success } from "../utils/response.js";
import {
  isCampusEmail,
  isValidOtp,
  normalizeEmail,
} from "../utils/validators.js";

function requireCampusEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!isCampusEmail(normalizedEmail)) {
    const error = new Error("Please enter a valid email address.");
    error.statusCode = 400;
    throw error;
  }
  return normalizedEmail;
}

function requireOtp(otp) {
  if (!isValidOtp(otp)) {
    const error = new Error("Enter a valid 6-digit OTP.");
    error.statusCode = 400;
    throw error;
  }
}

async function requestOtp(req, res, purpose) {
  const email = requireCampusEmail(req.body?.email);
  const { plainOtp, otpRecord } = await createOtp({ email, purpose });

  try {
    await sendOtpEmail({ email, otp: plainOtp });
  } catch (error) {
    await otpRecord.deleteOne();
    throw error;
  }

  return success(
    res,
    "If the email is eligible, a verification code has been sent.",
  );
}

export async function requestSignupOtp(req, res) {
  return requestOtp(req, res, "signup");
}

export async function verifySignupOtp(req, res) {
  const email = requireCampusEmail(req.body?.email);
  requireOtp(req.body?.otp);

  const verified = await verifyOtp({
    email,
    purpose: "signup",
    otp: req.body.otp,
  });
  if (!verified)
    return res
      .status(400)
      .json({ success: false, message: "Invalid or expired OTP." });

  const user = await createOrVerifyUser(email, {
    termsAccepted: true,
    termsAcceptedAt: new Date(),
  });
  await Profile.updateOne(
    { userId: user._id },
    { $setOnInsert: { userId: user._id } },
    { upsert: true },
  );
  const token = createAuthToken(user);
  return created(res, "Signup successful.", {
    token,
    user: { id: user.id, email: user.email },
  });
}

export async function requestLoginOtp(req, res) {
  const email = requireCampusEmail(req.body?.email);

  // Optimized fast existence check
  const existingUser = await User.exists({ email, isEmailVerified: true });
  if (!existingUser) {
    return res.status(404).json({
      success: false,
      isNewUser: true,
      message: "No account found with this email. Please sign up to join SGT.",
    });
  }

  return requestOtp(req, res, "login");
}

export async function verifyLoginOtp(req, res) {
  const email = requireCampusEmail(req.body?.email);
  requireOtp(req.body?.otp);

  const user = await User.findOne({ email, isEmailVerified: true });
  const verified = await verifyOtp({
    email,
    purpose: "login",
    otp: req.body.otp,
  });

  if (!user || !verified)
    return res
      .status(400)
      .json({ success: false, message: "Invalid or expired OTP." });

  user.lastLoginAt = new Date();
  await user.save();
  await Profile.updateOne(
    { userId: user._id },
    { $setOnInsert: { userId: user._id } },
    { upsert: true },
  );
  const token = createAuthToken(user);
  return success(res, "Login successful.", {
    token,
    user: { id: user.id, email: user.email },
  });
}

export async function getCurrentUser(req, res) {
  return success(res, "Authenticated user.", {
    user: { id: req.user.id, email: req.user.email },
  });
}

export function logout(req, res) {
  return success(res, "Logout successful. Remove the token from the client.");
}
