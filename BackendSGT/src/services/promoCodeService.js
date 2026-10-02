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
 * Generates an uppercase unique code derived from a prefix/title + number/percentage
 */
export async function generateUniqueOfferCode(prefix = "SGT", discountPercent = 50) {
  let base = (prefix || "SGT")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
  if (!base) base = "SGT";

  const candidates = [
    `${base}${discountPercent}`,
    `${base}PASS`,
    `${base}FREE`,
    `${base}VIP`,
    `${base}100`,
    `${base}50`,
    `${base}FEST`,
    `${base}DANDIYA`,
    `${base}2026`,
    `${base}777`,
  ];

  for (const cand of candidates) {
    const exists = await PromoCode.findOne({ code: cand }).lean();
    if (!exists) return cand;
  }

  // Fallback with random numbers
  for (let i = 0; i < 100; i++) {
    const randomNum = Math.floor(10 + Math.random() * 990);
    const candidate = `${base}${randomNum}`;
    const exists = await PromoCode.findOne({ code: candidate }).lean();
    if (!exists) return candidate;
  }

  return `${base}${Date.now().toString().slice(-4)}`;
}

/**
 * Generates an uppercase unique promo code derived from influencer name + numbers
 */
export async function generateUniquePromoCode(influencerName) {
  if (!influencerName || typeof influencerName !== "string") {
    throw invalid("Influencer name is required to generate code.");
  }

  const words = influencerName.trim().split(/\s+/);
  let firstName = (words[0] || "").toUpperCase().replace(/[^A-Z]/g, "");

  if (!firstName) {
    firstName =
      influencerName
        .toUpperCase()
        .replace(/[^A-Z]/g, "")
        .slice(0, 8) || "SGT";
  }

  firstName = firstName.slice(0, 10);

  const numberCombinations = [
    "150",
    "250",
    "50",
    "10",
    "20",
    "25",
    "99",
    "07",
    "11",
    "100",
    "2026",
    "777",
    "999",
    "101",
    "77",
    "88",
  ];

  for (const num of numberCombinations) {
    const candidate = `${firstName}${num}`;
    const exists = await PromoCode.findOne({ code: candidate }).lean();
    if (!exists) return candidate;
  }

  for (let i = 0; i < 100; i++) {
    const randomNum = Math.floor(10 + Math.random() * 990);
    const candidate = `${firstName}${randomNum}`;
    const exists = await PromoCode.findOne({ code: candidate }).lean();
    if (!exists) return candidate;
  }

  return `${firstName}${Date.now().toString().slice(-3)}`;
}

/**
 * Helper to compute discount amount for a given plan and promo doc
 */
function computeDiscountForPlan(promo, planAmount, planId) {
  if (promo.discountType === "PERCENTAGE") {
    const percent = Math.min(100, Math.max(0, promo.discountPercentage || 0));
    if (percent === 100) return planAmount;
    return Math.round((planAmount * percent) / 100);
  }

  // Flat discounts
  if (planId === "vibe") {
    return Math.min(planAmount, promo.discount499 ?? 150);
  }
  return Math.min(planAmount, promo.discount999 ?? 250);
}

/**
 * Validates a promo / offer code for user during checkout
 * Supports up to 100% discount, usage limits (maxUses), and plan restrictions
 */
export async function validatePromoCodeUser({ code, planId } = {}) {
  if (!code || typeof code !== "string") {
    throw invalid("Please enter a valid offer / promo code.");
  }

  const cleanedCode = code.trim().toUpperCase();
  const promo = await PromoCode.findOne({ code: cleanedCode });

  if (!promo) {
    throw invalid("Invalid code. Please check spelling and try again.", 404);
  }

  if (!promo.isActive) {
    throw invalid("This code is currently inactive or has been disabled.", 400);
  }

  // Check usage limit ("kitne times use honge")
  if (promo.maxUses > 0 && promo.totalUses >= promo.maxUses) {
    throw invalid(
      `This offer code has reached its maximum redemption limit of ${promo.maxUses} uses.`,
      400,
    );
  }

  const planKey = (planId || "premium").toLowerCase().trim();
  const isVibe = planKey === "vibe";
  const planInfo = isVibe ? SGT_PLANS.vibe : SGT_PLANS.premium;

  // Check plan applicability
  if (promo.applicablePlans && promo.applicablePlans !== "all") {
    if (promo.applicablePlans !== planKey) {
      throw invalid(
        `This code is only valid for the ${promo.applicablePlans === "vibe" ? "Vibe Plan (₹499)" : "Premium Plan (₹999)"}.`,
        400,
      );
    }
  }

  const originalAmount = planInfo.amount; // 499 or 999
  const discountAmount = computeDiscountForPlan(promo, originalAmount, planInfo.id);
  const finalAmount = Math.max(0, originalAmount - discountAmount);

  const vibeDiscount = computeDiscountForPlan(promo, 499, "vibe");
  const premiumDiscount = computeDiscountForPlan(promo, 999, "premium");

  let celebrationMsg = "";
  if (finalAmount === 0) {
    celebrationMsg = `🎉 100% FREE PASS! Code ${promo.code} unlocks a 100% Free Dandiya Pass.`;
  } else if (promo.discountType === "PERCENTAGE") {
    celebrationMsg = `🎉 Offer code ${promo.code} applied! ${promo.discountPercentage}% OFF (Saved ₹${discountAmount}).`;
  } else {
    celebrationMsg = `🎉 Promo code ${promo.code} applied! ₹${discountAmount} discount unlocked.`;
  }

  return {
    valid: true,
    promoId: promo._id,
    code: promo.code,
    codeType: promo.codeType,
    title: promo.title || promo.influencerName,
    discountType: promo.discountType,
    discountPercentage: promo.discountPercentage,
    isFreePass: finalAmount === 0,
    planId: planInfo.id,
    planName: planInfo.name,
    originalAmount,
    discountAmount,
    finalAmount,
    discounts: {
      vibe: {
        original: 499,
        discount: vibeDiscount,
        final: Math.max(0, 499 - vibeDiscount),
      },
      premium: {
        original: 999,
        discount: premiumDiscount,
        final: Math.max(0, 999 - premiumDiscount),
      },
    },
    message: celebrationMsg,
  };
}

/**
 * Admin: Creates a new Offer Code with percentage (up to 100%) or flat discount and usage limit
 */
export async function createOfferCodeAdmin({
  code,
  title,
  discountType = "PERCENTAGE",
  discountPercentage = 0,
  discount499 = 150,
  discount999 = 250,
  maxUses = 0,
  applicablePlans = "all",
  notes = "",
  adminId = "admin",
}) {
  let finalCode = (code || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");

  if (!finalCode) {
    finalCode = await generateUniqueOfferCode(title || "SGT", discountPercentage || 50);
  }

  if (finalCode.length < 2) {
    throw invalid("Offer code must be at least 2 characters long.");
  }

  // Duplicate check
  const existing = await PromoCode.findOne({ code: finalCode });
  if (existing) {
    throw invalid(`The code "${finalCode}" already exists. Please choose a unique code name.`, 409);
  }

  const sanitizedDiscountPercent = Math.min(100, Math.max(0, Number(discountPercentage) || 0));
  const sanitizedMaxUses = Math.max(0, Number(maxUses) || 0);

  const offer = await PromoCode.create({
    code: finalCode,
    codeType: "OFFER_CODE",
    title: title?.trim() || `Offer ${finalCode}`,
    discountType: discountType === "FLAT" ? "FLAT" : "PERCENTAGE",
    discountPercentage: sanitizedDiscountPercent,
    discount499: Number(discount499) || 0,
    discount999: Number(discount999) || 0,
    maxUses: sanitizedMaxUses,
    applicablePlans: ["all", "vibe", "premium"].includes(applicablePlans) ? applicablePlans : "all",
    notes: notes?.trim() || "",
    createdBy: adminId || "admin",
    isActive: true,
  });

  return offer;
}

/**
 * Admin: Lists all Offer Codes with usage progress, statistics, and conversions
 */
export async function listOfferCodesAdmin() {
  const offerCodes = await PromoCode.find({ codeType: "OFFER_CODE" })
    .sort({ createdAt: -1 })
    .lean();

  const totalOfferCodes = offerCodes.length;
  const activeOfferCodes = offerCodes.filter((o) => o.isActive).length;
  const totalUses = offerCodes.reduce((sum, o) => sum + (o.totalUses || 0), 0);
  const totalRevenue = offerCodes.reduce((sum, o) => sum + (o.totalRevenue || 0), 0);
  const totalDiscountGiven = offerCodes.reduce((sum, o) => sum + (o.totalDiscountGiven || 0), 0);

  return {
    summary: {
      totalOfferCodes,
      activeOfferCodes,
      totalUses,
      totalRevenue,
      totalDiscountGiven,
    },
    offerCodes: offerCodes.map((o) => ({
      id: o._id.toString(),
      code: o.code,
      title: o.title || o.code,
      discountType: o.discountType,
      discountPercentage: o.discountPercentage,
      discount499: o.discount499,
      discount999: o.discount999,
      maxUses: o.maxUses || 0,
      totalUses: o.totalUses || 0,
      isExhausted: o.maxUses > 0 && o.totalUses >= o.maxUses,
      applicablePlans: o.applicablePlans || "all",
      isActive: o.isActive,
      totalRevenue: o.totalRevenue || 0,
      totalDiscountGiven: o.totalDiscountGiven || 0,
      notes: o.notes || "",
      createdAt: o.createdAt,
    })),
  };
}

/**
 * Admin: Toggle Offer Code status (Active / Inactive)
 */
export async function toggleOfferCodeStatusAdmin(id) {
  const offer = await PromoCode.findById(id);
  if (!offer) {
    throw invalid("Offer code not found.", 404);
  }
  offer.isActive = !offer.isActive;
  await offer.save();
  return offer;
}

/**
 * Admin: Delete Offer Code
 */
export async function deleteOfferCodeAdmin(id) {
  const offer = await PromoCode.findById(id);
  if (!offer) {
    throw invalid("Offer code not found.", 404);
  }
  await PromoCode.findByIdAndDelete(id);
  return { success: true, message: `Offer code "${offer.code}" deleted.` };
}

/**
 * Admin: Creates a new influencer and assigns a promo code
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
    const existing = await PromoCode.findOne({ code: finalCode });
    if (existing) {
      throw invalid(
        `Promo code "${finalCode}" is already taken. Please choose a unique code.`,
        409,
      );
    }
  } else {
    finalCode = await generateUniquePromoCode(influencerName);
  }

  const promo = await PromoCode.create({
    influencerName: influencerName.trim(),
    influencerEmail: cleanedEmail,
    code: finalCode,
    codeType: "INFLUENCER",
    title: `Influencer: ${influencerName.trim()}`,
    discountType: "FLAT",
    discount499: Number(discount499) || 150,
    discount999: Number(discount999) || 250,
    notes: notes?.trim() || "",
    createdBy: adminId || "admin",
    isActive: true,
  });

  return promo;
}

/**
 * Admin: Lists all influencers with their codes, conversions, and metrics
 */
export async function listInfluencersAdmin() {
  const influencers = await PromoCode.find({ codeType: "INFLUENCER" })
    .sort({ createdAt: -1 })
    .lean();

  const totalInfluencers = influencers.length;
  const totalConversions = influencers.reduce((sum, inf) => sum + (inf.totalUses || 0), 0);
  const totalRevenue = influencers.reduce((sum, inf) => sum + (inf.totalRevenue || 0), 0);
  const totalDiscountGiven = influencers.reduce(
    (sum, inf) => sum + (inf.totalDiscountGiven || 0),
    0,
  );

  return {
    summary: {
      totalInfluencers,
      totalConversions,
      totalRevenue,
      totalDiscountGiven,
    },
    influencers: influencers.map((inf) => ({
      id: inf._id.toString(),
      influencerName: inf.influencerName,
      influencerEmail: inf.influencerEmail,
      code: inf.code,
      discount499: inf.discount499,
      discount999: inf.discount999,
      isActive: inf.isActive,
      totalUses: inf.totalUses || 0,
      totalRevenue: inf.totalRevenue || 0,
      totalDiscountGiven: inf.totalDiscountGiven || 0,
      notes: inf.notes || "",
      createdAt: inf.createdAt,
    })),
  };
}

/**
 * Admin: Toggle influencer promo code active/inactive
 */
export async function toggleInfluencerStatusAdmin(id) {
  const promo = await PromoCode.findById(id);
  if (!promo) {
    throw invalid("Influencer promo code not found.", 404);
  }
  promo.isActive = !promo.isActive;
  await promo.save();
  return promo;
}

/**
 * Admin: Get detailed conversions (students who paid using this promo/offer code)
 */
export async function getPromoConversionsAdmin(promoId) {
  const promo = await PromoCode.findById(promoId).lean();
  if (!promo) {
    throw invalid("Promo / Offer code not found.", 404);
  }

  const payments = await Payment.find({
    promoCodeId: promo._id,
  })
    .populate("userId", "email createdAt")
    .populate("institutionId", "name shortName city")
    .sort({ submittedAt: -1 })
    .lean();

  const userIds = payments.map((p) => p.userId?._id).filter(Boolean);
  const profiles = await Profile.find({ userId: { $in: userIds } })
    .select("userId fullName instagramHandle gender college")
    .lean();

  const profileMap = new Map();
  profiles.forEach((p) => profileMap.set(p.userId.toString(), p));

  const conversions = payments.map((p) => {
    const prof = p.userId?._id ? profileMap.get(p.userId._id.toString()) : null;
    return {
      paymentId: p._id.toString(),
      studentEmail: p.userId?.email || "Unknown",
      studentName: prof?.fullName || "Not provided",
      collegeName: p.institutionId?.name || prof?.college || "Campus",
      plan: p.plan,
      planName: p.planName,
      originalAmount: p.originalAmount || p.amount,
      discountAmount: p.discountAmount || 0,
      paidAmount: p.amount,
      utr: p.utr,
      screenshotUrl: p.screenshotUrl,
      status: p.status,
      submittedAt: p.submittedAt,
      approvedAt: p.approvedAt,
    };
  });

  return {
    promo: {
      id: promo._id.toString(),
      code: promo.code,
      title: promo.title,
      codeType: promo.codeType,
      influencerName: promo.influencerName,
      influencerEmail: promo.influencerEmail,
      discountPercentage: promo.discountPercentage,
      maxUses: promo.maxUses,
      totalUses: promo.totalUses,
      totalRevenue: promo.totalRevenue,
      totalDiscountGiven: promo.totalDiscountGiven,
    },
    conversions,
  };
}

/**
 * Called when a payment is APPROVED by admin
 * Increments usage metrics on the promo/offer code
 */
export async function recordPromoCodeUsageOnApproval(payment) {
  if (!payment?.promoCodeId) return;

  const promo = await PromoCode.findById(payment.promoCodeId);
  if (!promo) return;

  promo.totalUses = (promo.totalUses || 0) + 1;
  promo.totalRevenue = (promo.totalRevenue || 0) + (payment.amount || 0);
  promo.totalDiscountGiven =
    (promo.totalDiscountGiven || 0) + (payment.discountAmount || 0);

  // If maxUses reached, optionally mark inactive or let validation handle it
  await promo.save();
}
