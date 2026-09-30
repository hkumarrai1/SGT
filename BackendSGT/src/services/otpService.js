import Otp from "../models/Otp.js";
import { generateOtp, hashOtp, compareOtp } from "../utils/otpGenerator.js";

const OTP_LIFETIME_MS = 10 * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000;

export async function createOtp({ email, purpose }) {
  const latestOtp = await Otp.findOne({ email, purpose }).sort({
    createdAt: -1,
  });

  if (
    latestOtp &&
    Date.now() - latestOtp.createdAt.getTime() < OTP_COOLDOWN_MS
  ) {
    const retryAfterSeconds = Math.ceil(
      (OTP_COOLDOWN_MS - (Date.now() - latestOtp.createdAt.getTime())) / 1000,
    );
    const error = new Error("Please wait before requesting another OTP.");
    error.statusCode = 429;
    error.retryAfterSeconds = retryAfterSeconds;
    throw error;
  }

  await Otp.updateMany(
    { email, purpose, isUsed: false },
    { $set: { isUsed: true } },
  );

  const plainOtp = generateOtp();
  const createdAt = new Date();
  const otp = await Otp.create({
    email,
    purpose,
    otp: hashOtp(plainOtp),
    createdAt,
    expiresAt: new Date(createdAt.getTime() + OTP_LIFETIME_MS),
  });

  return { otpRecord: otp, plainOtp };
}

export async function verifyOtp({ email, purpose, otp }) {
  const record = await Otp.findOne({ email, purpose, isUsed: false }).sort({
    createdAt: -1,
  });

  if (
    !record ||
    record.expiresAt.getTime() <= Date.now() ||
    !compareOtp(otp, record.otp)
  ) {
    return false;
  }

  record.isUsed = true;
  await record.save();
  return true;
}
