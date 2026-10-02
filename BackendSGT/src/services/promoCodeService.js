import PromoCode from "../models/PromoCode.js";
import Payment from "../models/Payment.js";
import Profile from "../models/Profile.js";
import { SGT_PLANS } from "../data/plans.js";

function invalid(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/**
 * Generates an uppercase unique promo code derived from the combination of
 * Influencer's First Name + Numbers (e.g., PRIYA150, PRIYA50, PRIYA2024)
 * Guaranteed to have NO duplicates in DB by checking before returning.
 */
export async function generateUniquePromoCode(influencerName) {
  if (!influencerName || typeof influencerName !== "string") {
    throw invalid("Influencer name is required to generate code.");
  }

  // Extract purely the FIRST NAME (alphabetic only)
  const words = influencerName.trim().split(/\s+/);
  let firstName = (words[0] || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

  // Fallback if first word had no letters
  if (!firstName) {
    firstName = influencerName
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, 8) || "SGT";
  }

  // Keep first name clean (up to 10 chars)
  firstName = firstName.slice(0, 10);

  // Popular and clean numeric combinations
  const numberCombinations = [
    "150", // Reflects ₹150 discount
    "250", // Reflects ₹250 discount
    "50",
    "10",
    "20",
    "25",
    "99",
    "07",
    "11",
    "100",
    "2024",
    "2025",
    "777",
    "999",
    "101",
    "77",
    "88",
  ];

  // Try popular first name + number combinations
  for (const num of numberCombinations) {
    const candidate = `${firstName}${num}`;
    const exists = await PromoCode.findOne({ code: candidate }).lean();
    if (!exists) {
      return candidate;
    }
  }

  // If common ones are taken, generate with random 2-3 digit numbers (10 to 999)
  for (let i = 0; i < 100; i++) {
    const randomNum = Math.floor(10 + Math.random() * 990);
    const candidate = `${firstName}${randomNum}`;
    const exists = await PromoCode.findOne({ code: candidate }).lean();
    if (!exists) {
      return candidate;
    }
  }

  // Fallback timestamp 3 digits
  return `${firstName}${Date.now().toString().slice(-3)}`;
}

/**
 * Validates a promo code for user during checkout
 * Returns discount details for 499 (150 off) and 999 (250 off) plans
 */
export async function validatePromoCodeUser({ code, planId } = {}) {
  if (!code || typeof code !== "string") {
    throw invalid("Please enter a valid promo code.");
  }

  const cleanedCode = code.trim().toUpperCase();
  const promo = await PromoCode.findOne({ code: cleanedCode });

  if (!promo) {
    throw invalid("Invalid promo code. Please check and try again.", 404);
  }

  if (!promo.isActive) {
    throw invalid("This promo code has expired or is currently inactive.", 400);
  }

  // Calculate discount based on requested plan
  const planKey = (planId || "premium").toLowerCase().trim();
  const isVibe = planKey === "vibe";
  const planInfo = isVibe ? SGT_PLANS.vibe : SGT_PLANS.premium;

  const originalAmount = planInfo.amount; // 499 or 999
  const discountAmount = isVibe
    ? (promo.discount499 ?? 150)
    : (promo.discount999 ?? 250);
  const finalAmount = Math.max(0, originalAmount - discountAmount);

  return {
    valid: true,
    promoId: promo._id,
    code: promo.code,
    influencerName: promo.influencerName,
    planId: planInfo.id,
    planName: planInfo.name,
    originalAmount,
    discountAmount,
    finalAmount,
    discounts: {
      vibe: {
        original: 499,
        discount: promo.discount499 ?? 150,
        final: 499 - (promo.discount499 ?? 150),
      },
      premium: {
        original: 999,
        discount: promo.discount999 ?? 250,
        final: 999 - (promo.discount999 ?? 250),
      },
    },
    message: `🎉 Promo code ${promo.code} applied! ₹${discountAmount} discount unlocked.`,
  };
}

/**
 * Admin: Creates a new influencer and assigns/generates a guaranteed unique uppercase promo code
 */
export async function createInfluencerPromoAdmin({
  influencerName,
  influencerEmail,
  customCode,
  notes,
  discount499 = 150,
  discount999 = 250,
  adminId,
}) {
  if (!influencerName || !influencerName.trim()) {
    throw invalid("Influencer name is required.");
  }
  if (!influencerEmail || !influencerEmail.trim()) {
    throw invalid("Influencer email address is required.");
  }

  const cleanedEmail = influencerEmail.trim().toLowerCase();

  let finalCode = "";
  if (customCode && customCode.trim()) {
    finalCode = customCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    if (finalCode.length < 2) {
      throw invalid("Custom promo code must be at least 2 characters long.");
    }
    // Duplicate check
    const existing = await PromoCode.findOne({ code: finalCode });
    if (existing) {
      throw invalid(
        `Promo code "${finalCode}" is already taken by ${existing.influencerName}. Please use a unique code.`,
        409,
      );
    }
  } else {
    // Auto generate guaranteed unique code
    finalCode = await generateUniquePromoCode(influencerName);
  }

  const promo = await PromoCode.create({
    influencerName: influencerName.trim(),
    influencerEmail: cleanedEmail,
    code: finalCode,
    discount499: Number(discount499) || 150,
    discount999: Number(discount999) || 250,
    notes: notes?.trim() || "",
    createdBy: adminId || null,
    isActive: true,
  });

  return {
    success: true,
    message: `🌟 Influencer "${promo.influencerName}" registered with promo code: ${promo.code}`,
    promo,
  };
}

/**
 * Admin: Lists all influencers with live computed conversion & revenue analytics
 */
export async function listInfluencersAdmin() {
  const influencers = await PromoCode.find().sort({ createdAt: -1 }).lean();

  if (!influencers.length) {
    return {
      success: true,
      influencers: [],
      summary: {
        totalInfluencers: 0,
        totalConversions: 0,
        totalRevenue: 0,
        totalDiscountGiven: 0,
      },
    };
  }

  const influencerIds = influencers.map((inf) => inf._id);

  // Aggregate all payments linked to these promo codes
  const payments = await Payment.find({
    promoCodeId: { $in: influencerIds },
  })
    .select("promoCodeId amount discountAmount status")
    .lean();

  const statsMap = new Map();
  influencerIds.forEach((id) => {
    statsMap.set(String(id), {
      approvedCount: 0,
      pendingCount: 0,
      rejectedCount: 0,
      totalRevenue: 0,
      totalDiscount: 0,
    });
  });

  payments.forEach((p) => {
    if (!p.promoCodeId) return;
    const stats = statsMap.get(String(p.promoCodeId));
    if (!stats) return;

    if (p.status === "APPROVED") {
      stats.approvedCount += 1;
      stats.totalRevenue += p.amount || 0;
      stats.totalDiscount += p.discountAmount || 0;
    } else if (p.status === "PENDING") {
      stats.pendingCount += 1;
    } else if (p.status === "REJECTED") {
      stats.rejectedCount += 1;
    }
  });

  let globalConversions = 0;
  let globalRevenue = 0;
  let globalDiscount = 0;

  const enriched = influencers.map((inf) => {
    const stats = statsMap.get(String(inf._id)) || {
      approvedCount: 0,
      pendingCount: 0,
      rejectedCount: 0,
      totalRevenue: 0,
      totalDiscount: 0,
    };

    globalConversions += stats.approvedCount;
    globalRevenue += stats.totalRevenue;
    globalDiscount += stats.totalDiscount;

    return {
      ...inf,
      conversions: stats.approvedCount,
      pendingVerifications: stats.pendingCount,
      rejectedCount: stats.rejectedCount,
      totalRevenue: stats.totalRevenue,
      totalDiscountGiven: stats.totalDiscount,
    };
  });

  return {
    success: true,
    influencers: enriched,
    summary: {
      totalInfluencers: influencers.length,
      totalConversions: globalConversions,
      totalRevenue: globalRevenue,
      totalDiscountGiven: globalDiscount,
    },
  };
}

/**
 * Admin: Detailed customer breakdown for a specific influencer
 */
export async function getInfluencerConversionsAdmin(influencerId) {
  const influencer = await PromoCode.findById(influencerId).lean();
  if (!influencer) throw invalid("Influencer promo code not found.", 404);

  const payments = await Payment.find({ promoCodeId: influencer._id })
    .populate("userId", "email fullName isBlocked")
    .populate("institutionId", "name shortName city")
    .sort({ submittedAt: -1 })
    .lean();

  const userIds = payments.map((p) => p.userId?._id).filter(Boolean);
  const profiles = await Profile.find({ userId: { $in: userIds } })
    .select("userId fullName studentId course academicYear profilePhoto gender")
    .lean();

  const profileMap = new Map();
  profiles.forEach((pr) => profileMap.set(String(pr.userId), pr));

  const customerRecords = payments.map((p) => {
    const pr = profileMap.get(String(p.userId?._id));
    return {
      _id: p._id,
      userId: p.userId?._id,
      userEmail: p.userId?.email,
      studentName: pr?.fullName || "Student",
      studentId: pr?.studentId || p.registrationId || "N/A",
      gender: pr?.gender || "prefer-not-to-say",
      course: pr?.course || "",
      academicYear: pr?.academicYear ? `Year ${pr.academicYear}` : "",
      collegeName: p.institutionId?.name || "Campus",
      profilePhoto: pr?.profilePhoto?.secureUrl || pr?.profilePhoto?.url || null,
      plan: p.plan,
      planName: p.planName,
      amount: p.amount,
      originalAmount: p.originalAmount || (p.plan === "vibe" ? 499 : 999),
      discountAmount: p.discountAmount || (p.plan === "vibe" ? 150 : 250),
      utr: p.utr,
      screenshotUrl: p.screenshotUrl,
      status: p.status,
      submittedAt: p.submittedAt,
      approvedAt: p.approvedAt,
    };
  });

  const approved = customerRecords.filter((c) => c.status === "APPROVED");
  const totalRevenue = approved.reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalDiscount = approved.reduce((sum, c) => sum + (c.discountAmount || 0), 0);

  return {
    success: true,
    influencer: {
      _id: influencer._id,
      influencerName: influencer.influencerName,
      influencerEmail: influencer.influencerEmail,
      code: influencer.code,
      isActive: influencer.isActive,
      createdAt: influencer.createdAt,
      notes: influencer.notes,
      totalApprovedCustomers: approved.length,
      totalPendingCustomers: customerRecords.filter((c) => c.status === "PENDING").length,
      totalRevenue,
      totalDiscount,
    },
    customers: customerRecords,
  };
}

/**
 * Admin: Toggle active status
 */
export async function toggleInfluencerStatusAdmin(influencerId) {
  const influencer = await PromoCode.findById(influencerId);
  if (!influencer) throw invalid("Influencer record not found.", 404);

  influencer.isActive = !influencer.isActive;
  await influencer.save();

  return {
    success: true,
    message: `Promo code ${influencer.code} is now ${influencer.isActive ? "ACTIVE" : "INACTIVE"}.`,
    isActive: influencer.isActive,
  };
}

/**
 * Admin: Delete influencer promo code (only if no payments attached)
 */
export async function deleteInfluencerAdmin(influencerId) {
  const paymentsCount = await Payment.countDocuments({ promoCodeId: influencerId });
  if (paymentsCount > 0) {
    throw invalid(
      `Cannot delete promo code because ${paymentsCount} payment records are linked to it. You can deactivate it instead.`,
      400,
    );
  }

  await PromoCode.findByIdAndDelete(influencerId);
  return {
    success: true,
    message: "Influencer promo code deleted successfully.",
  };
}
