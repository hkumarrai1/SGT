export const SGT_PLANS = {
  vibe: {
    id: "vibe",
    name: "Vibe Dandiya Plan",
    eyebrow: "FIND YOUR DANDIYA PARTNER",
    amount: 499,
    currency: "INR",
    refundPolicy: "50% refund if unmatched",
    features: [
      "Create your profile & set preferences",
      "Get matched with compatible participants",
      "Chat and connect before the event",
      "Attend the university Dandiya event",
      "Chance to find your Dandiya partner",
    ],
  },
  premium: {
    id: "premium",
    name: "Premium Dandiya Night Plan",
    eyebrow: "A COMPLETE EXPERIENCE",
    amount: 999,
    currency: "INR",
    popular: true,
    refundPolicy: "65% guaranteed refund if unmatched",
    features: [
      "Everything in Vibe Dandiya Plan",
      "Priority matching for better chances",
      "Attend the exclusive Dandiya Night",
      "₹400 per participant for refreshments",
      "Access to premium event perks",
      "More opportunities to connect",
    ],
  },
};

export const OFFICIAL_UPI = {
  vpa: "9971284797@ptaxis",
  payeeName: "SGT Souls Gather Together",
  note: "SGT Dandiya Night Pass",
};

export function getPlanById(planId) {
  if (!planId || typeof planId !== "string") return null;
  return SGT_PLANS[planId.toLowerCase().trim()] || null;
}
