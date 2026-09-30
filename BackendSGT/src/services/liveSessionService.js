import crypto from "node:crypto";
import QRCode from "qrcode";
import LiveVerificationSession from "../models/LiveVerificationSession.js";
import Profile from "../models/Profile.js";
import Verification from "../models/Verification.js";
import { env } from "../config/env.js";

const SESSION_LIFETIME_MS = 5 * 60 * 1000;

function invalid(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function ensureReadyForLivePhoto(userId) {
  const profile = await Profile.findOne({ userId });
  if (!profile?.institutionId)
    throw invalid("Complete institution selection first.");
  if (profile.onboardingStatus !== "COLLEGE_ID_SUBMITTED")
    throw invalid("Submit your College ID before taking a Live Photo.");
  const collegeId = await Verification.findOne({
    userId,
    verificationStatus: { $in: ["PENDING", "VERIFIED"] },
  }).select("_id");
  if (!collegeId)
    throw invalid("Submit your College ID before taking a Live Photo.");
  return profile;
}

export async function createLiveSession(userId, clientBaseUrl = null) {
  await ensureReadyForLivePhoto(userId);
  await LiveVerificationSession.updateMany(
    { userId, status: { $in: ["ACTIVE", "PHONE_CONNECTED"] } },
    { $set: { status: "CANCELLED" } },
  );

  const token = crypto.randomBytes(32).toString("hex");
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
  await LiveVerificationSession.create({
    sessionId,
    tokenHash: hashToken(token),
    userId,
    step: "LIVE_PHOTO",
    status: "ACTIVE",
    expiresAt,
  });

  const baseUrl = (
    clientBaseUrl ||
    env.mobileVerifyBaseUrl ||
    env.clientUrl ||
    "http://localhost:5173"
  )
    .trim()
    .replace(/\/+$/, "");
  const mobileUrl = `${baseUrl}/verify/mobile?t=${encodeURIComponent(token)}`;
  const qrDataUrl = await QRCode.toDataURL(mobileUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 280,
  });
  return { sessionId, qrDataUrl, expiresAt, status: "WAITING_FOR_PHONE" };
}

async function findActiveSession(token) {
  if (!token || typeof token !== "string" || token.length < 40)
    throw invalid("Invalid verification session.", 401);
  const session = await LiveVerificationSession.findOne({
    tokenHash: hashToken(token),
    step: "LIVE_PHOTO",
  });
  if (
    !session ||
    session.usedAt ||
    session.status === "CANCELLED" ||
    session.status === "COMPLETED" ||
    session.expiresAt.getTime() <= Date.now()
  ) {
    if (session && session.expiresAt.getTime() <= Date.now()) {
      session.status = "EXPIRED";
      await session.save();
    }
    throw invalid(
      "This verification session has expired or was already used.",
      401,
    );
  }
  return session;
}

export async function connectMobileSession(token) {
  const session = await findActiveSession(token);
  if (session.status === "ACTIVE") {
    session.status = "PHONE_CONNECTED";
    await session.save();
  }
  return { status: session.status, expiresAt: session.expiresAt };
}

export async function getOwnedSessionStatus(userId, sessionId) {
  const session = await LiveVerificationSession.findOne({
    userId,
    sessionId,
    step: "LIVE_PHOTO",
  }).select("status expiresAt");
  if (!session) throw invalid("Verification session not found.", 404);
  if (
    session.expiresAt.getTime() <= Date.now() &&
    ["ACTIVE", "PHONE_CONNECTED"].includes(session.status)
  ) {
    session.status = "EXPIRED";
    await session.save();
  }
  return {
    status: session.status === "ACTIVE" ? "WAITING_FOR_PHONE" : session.status,
    expiresAt: session.expiresAt,
  };
}

export async function consumeMobileSession(token) {
  return findActiveSession(token);
}

export function hashLiveToken(token) {
  return hashToken(token);
}
