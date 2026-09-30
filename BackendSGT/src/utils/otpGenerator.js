import crypto from "node:crypto";
import { env } from "../config/env.js";

export function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

export function hashOtp(otp) {
  return crypto
    .createHmac("sha256", env.otpHashSecret)
    .update(otp)
    .digest("hex");
}

export function compareOtp(otp, storedHash) {
  const suppliedHash = Buffer.from(hashOtp(otp), "hex");
  const expectedHash = Buffer.from(storedHash, "hex");

  return (
    suppliedHash.length === expectedHash.length &&
    crypto.timingSafeEqual(suppliedHash, expectedHash)
  );
}
