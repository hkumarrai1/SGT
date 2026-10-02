import sharp from "sharp";
import cloudinary from "../config/cloudinary.js";
import Payment from "../models/Payment.js";
import Profile from "../models/Profile.js";
import User from "../models/User.js";
import PromoCode from "../models/PromoCode.js";
import { getPlanById } from "../data/plans.js";

const MAX_BYTES = 10 * 1024 * 1024;
const PAYMENT_FOLDER = "SGT/payments/screenshots";

function invalid(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function signedScreenshotUrl(publicId) {
  if (!publicId) return null;
  try {
    return cloudinary.url(publicId, {
      type: "private",
      resource_type: "image",
      sign_url: true,
      secure: true,
      expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour valid
    });
  } catch {
    return null;
  }
}

async function inspectScreenshot(file) {
  if (!file?.buffer?.length) throw invalid("Payment screenshot is required.");
  if (file.buffer.length > MAX_BYTES) {
    throw invalid("Payment screenshot must be 10 MB or smaller.", 413);
  }

  let metadata;
  try {
    metadata = await sharp(file.buffer).metadata();
  } catch {
    throw invalid("The uploaded file is not a valid readable image.");
  }

  if (!["jpeg", "png", "webp"].includes(metadata.format)) {
    throw invalid("Please upload a JPG, PNG, or WebP screenshot.");
  }

  if (!metadata.width || !metadata.height || metadata.width < 100 || metadata.height < 100) {
    throw invalid("Image dimensions are too small to be a payment screenshot.");
  }

  return metadata;
}

function uploadPrivateScreenshot(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: PAYMENT_FOLDER, resource_type: "image", type: "private" },
      (error, result) => (error ? reject(error) : resolve(result)),
    );
    stream.end(buffer);
  });
}

export async function submitPaymentProof(
  userId,
  { planId, plan: planParam, utr, promoCode: promoCodeParam },
  file,
) {
  const user = await User.findById(userId);
  if (!user) throw invalid("User account not found.", 404);

  const profile = await Profile.findOne({ userId });
  if (!profile)
    throw invalid(
      "Profile not found. Please complete profile setup first.",
      400,
    );

  const targetPlanId = planId || planParam;
  const plan = getPlanById(targetPlanId);
  if (!plan)
    throw invalid(
      "Select a valid plan (Vibe Dandiya Plan or Premium Dandiya Night Plan).",
      400,
    );

  // Require UTR from student for clear admin verification
  const cleanedUtr = typeof utr === "string" ? utr.trim().toUpperCase() : "";
  if (!cleanedUtr) {
    throw invalid(
      "Please enter your 12-digit UTR / UPI Transaction Reference Number.",
      400,
    );
  }

  // Prevent multiple active PENDING payments from the same user
  const existingPending = await Payment.findOne({ userId, status: "PENDING" });
  if (existingPending) {
    throw invalid(
      "You already have a pending payment verification request under review. Please wait for verification.",
      400,
    );
  }

  // Prevent duplicate payment for an already approved plan of the same tier
  if (profile.activePlan === plan.id && profile.paymentStatus === "PAID") {
    throw invalid(`Your ${plan.name} is already active!`, 400);
  }

  // Check for duplicate UTR submissions
  const duplicateUtr = await Payment.findOne({
    utr: cleanedUtr,
    status: { $in: ["PENDING", "APPROVED"] },
  });
  if (duplicateUtr) {
    throw invalid(
      "This UTR / Transaction ID has already been submitted.",
      400,
    );
  }

  // Promo Code Validation & Price Adjustment
  let promoDoc = null;
  const originalAmount = plan.amount;
  let discountAmount = 0;
  let finalAmount = plan.amount;

  if (promoCodeParam && typeof promoCodeParam === "string" && promoCodeParam.trim()) {
    const cleanedCode = promoCodeParam.trim().toUpperCase();
    promoDoc = await PromoCode.findOne({ code: cleanedCode, isActive: true });
    if (!promoDoc) {
      throw invalid("The entered offer / promo code is invalid or has expired.", 400);
    }

    if (promoDoc.maxUses > 0 && promoDoc.totalUses >= promoDoc.maxUses) {
      throw invalid(`This offer code has reached its maximum usage limit of ${promoDoc.maxUses} uses.`, 400);
    }

    if (promoDoc.applicablePlans && promoDoc.applicablePlans !== "all" && promoDoc.applicablePlans !== plan.id) {
      throw invalid(`This code is only valid for the ${promoDoc.applicablePlans === "vibe" ? "Vibe Plan (₹499)" : "Premium Plan (₹999)"}.`, 400);
    }

    const isVibe = plan.id === "vibe";
    if (promoDoc.discountType === "PERCENTAGE") {
      const pct = Math.min(100, Math.max(0, promoDoc.discountPercentage || 0));
      discountAmount = pct === 100 ? originalAmount : Math.round((originalAmount * pct) / 100);
    } else {
      discountAmount = isVibe
        ? (promoDoc.discount499 ?? 150)
        : (promoDoc.discount999 ?? 250);
    }
    finalAmount = Math.max(0, originalAmount - discountAmount);
  }

  // Validate screenshot file
  await inspectScreenshot(file);

  // Upload to Cloudinary
  const uploaded = await uploadPrivateScreenshot(file.buffer);

  const payment = await Payment.create({
    userId,
    institutionId: profile.institutionId || null,
    registrationId: profile.studentId || user.email,
    plan: plan.id,
    planName: plan.name,
    amount: finalAmount,
    originalAmount,
    discountAmount,
    promoCode: promoDoc ? promoDoc.code : null,
    promoCodeId: promoDoc ? promoDoc._id : null,
    currency: plan.currency,
    utr: cleanedUtr,
    screenshotUrl: uploaded.secure_url,
    cloudinaryPublicId: uploaded.public_id,
    status: "PENDING",
    submittedAt: new Date(),
  });

  // Update profile paymentStatus
  profile.paymentStatus = "PENDING";
  profile.activePaymentId = payment._id;
  await profile.save();

  return payment;
}

export async function getMyPaymentStatus(userId) {
  const profile = await Profile.findOne({ userId }).lean();
  const latestPayment = await Payment.findOne({ userId })
    .sort({ submittedAt: -1 })
    .lean();

  let signedScreenshot = null;
  if (latestPayment?.cloudinaryPublicId) {
    signedScreenshot = signedScreenshotUrl(latestPayment.cloudinaryPublicId);
  }

  return {
    activePlan: profile?.activePlan || "none",
    paymentStatus: profile?.paymentStatus || "UNPAID",
    latestPayment: latestPayment
      ? {
          _id: latestPayment._id,
          plan: latestPayment.plan,
          planName: latestPayment.planName,
          amount: latestPayment.amount,
          utr: latestPayment.utr,
          status: latestPayment.status,
          submittedAt: latestPayment.submittedAt,
          approvedAt: latestPayment.approvedAt,
          rejectionReason: latestPayment.rejectionReason,
          screenshotUrl: signedScreenshot || latestPayment.screenshotUrl,
        }
      : null,
  };
}

export async function listPaymentsAdmin({ status } = {}) {
  const filter = {};
  if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status)) {
    filter.status = status;
  }

  const payments = await Payment.find(filter)
    .populate("userId", "email")
    .populate("institutionId", "name shortName city")
    .sort({ submittedAt: -1 })
    .lean();

  // Attach profile details for rich admin view
  const userIds = payments.map((p) => p.userId?._id).filter(Boolean);
  const profiles = await Profile.find({ userId: { $in: userIds } })
    .select("userId fullName studentId course academicYear")
    .lean();

  const profileMap = new Map();
  profiles.forEach((pr) => profileMap.set(String(pr.userId), pr));

  return payments.map((payment) => {
    const studentProfile = profileMap.get(String(payment.userId?._id));
    const signedUrl = signedScreenshotUrl(payment.cloudinaryPublicId);

    return {
      _id: payment._id,
      userId: {
        _id: payment.userId?._id,
        email: payment.userId?.email || "Unknown",
      },
      userEmail: payment.userId?.email || "Unknown",
      studentName: studentProfile?.fullName || "Not provided",
      profile: studentProfile || {
        fullName: "Not provided",
        studentId: payment.registrationId || "N/A",
      },
      registrationId: payment.registrationId || studentProfile?.studentId || "N/A",
      institutionId: payment.institutionId,
      institutionName: payment.institutionId?.name || "Campus",
      course: studentProfile?.course || "",
      academicYear: studentProfile?.academicYear ? `Year ${studentProfile.academicYear}` : "",
      plan: payment.plan,
      planName: payment.planName,
      amount: payment.amount,
      currency: payment.currency || "INR",
      utr: payment.utr || "",
      screenshotUrl: signedUrl || payment.screenshotUrl,
      status: payment.status,
      rejectionReason: payment.rejectionReason,
      submittedAt: payment.submittedAt,
      approvedAt: payment.approvedAt,
      approvedBy: payment.approvedBy,
      reviewedAt: payment.reviewedAt,
    };
  });
}

export async function getPaymentDetailAdmin(paymentId) {
  const payment = await Payment.findById(paymentId)
    .populate("userId", "email")
    .populate("institutionId", "name city")
    .lean();

  if (!payment) throw invalid("Payment record not found.", 404);

  const profile = await Profile.findOne({ userId: payment.userId?._id }).lean();
  const signedUrl = signedScreenshotUrl(payment.cloudinaryPublicId);

  return {
    ...payment,
    userEmail: payment.userId?.email,
    studentName: profile?.fullName,
    studentId: profile?.studentId,
    course: profile?.course,
    academicYear: profile?.academicYear,
    screenshotUrl: signedUrl || payment.screenshotUrl,
  };
}

export async function approvePaymentAdmin(paymentId, adminId) {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw invalid("Payment record not found.", 404);

  if (payment.status === "APPROVED") {
    return { success: true, message: "Payment is already approved.", payment };
  }

  if (payment.status !== "PENDING") {
    throw invalid(`Cannot approve a payment with status ${payment.status}.`, 409);
  }

  payment.status = "APPROVED";
  payment.approvedAt = new Date();
  payment.approvedBy = adminId;
  payment.reviewedAt = new Date();
  payment.rejectionReason = undefined;
  await payment.save();

  // Activate premium plan on Profile
  await Profile.updateOne(
    { userId: payment.userId },
    {
      $set: {
        activePlan: payment.plan,
        paymentStatus: "PAID",
        activePaymentId: payment._id,
      },
    },
  );

  // Update Influencer statistics if promo code was used
  if (payment.promoCodeId) {
    await PromoCode.findByIdAndUpdate(payment.promoCodeId, {
      $inc: {
        totalUses: 1,
        totalRevenue: payment.amount || 0,
        totalDiscountGiven: payment.discountAmount || 0,
      },
    });
  }

  return {
    success: true,
    message: `Payment approved! ${payment.planName} is now active for user.`,
    payment,
  };
}

export async function rejectPaymentAdmin(paymentId, adminId, reason) {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw invalid("Payment record not found.", 404);

  if (payment.status !== "PENDING") {
    throw invalid(`Cannot reject a payment that is already ${payment.status.toLowerCase()}.`, 409);
  }

  const cleanedReason = typeof reason === "string" && reason.trim().length > 0
    ? reason.trim().slice(0, 500)
    : "Payment screenshot or UTR could not be verified. Please check and re-upload.";

  payment.status = "REJECTED";
  payment.rejectionReason = cleanedReason;
  payment.reviewedAt = new Date();
  payment.approvedBy = adminId;
  await payment.save();

  // Update profile status if this was their active payment
  const profile = await Profile.findOne({ userId: payment.userId });
  if (profile) {
    // Only revert if user doesn't already have an approved plan from another payment
    if (profile.activePlan === "none" || String(profile.activePaymentId) === String(payment._id)) {
      profile.paymentStatus = "UNPAID";
      await profile.save();
    }
  }

  return {
    success: true,
    message: "Payment rejected.",
    payment,
  };
}
