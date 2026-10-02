import {
  createInfluencerPromoAdmin,
  createOfferCodeAdmin,
  deleteOfferCodeAdmin,
  generateUniqueOfferCode,
  generateUniquePromoCode,
  getPromoConversionsAdmin,
  listInfluencersAdmin,
  listOfferCodesAdmin,
  toggleInfluencerStatusAdmin,
  toggleOfferCodeStatusAdmin,
  validatePromoCodeUser,
} from "../services/promoCodeService.js";

// User checkout validation (used in /payment)
export async function validatePromoCode(req, res) {
  const { code, planId } = req.body || {};
  const result = await validatePromoCodeUser({ code, planId });
  return res.json({
    success: true,
    ...result,
  });
}

// Admin: Preview / Generate unique code for influencers
export async function previewUniqueCode(req, res) {
  const name = req.query.name || req.body.name;
  const code = await generateUniquePromoCode(name);
  return res.json({
    success: true,
    code,
  });
}

// Admin: Preview / Generate unique offer code
export async function previewUniqueOfferCode(req, res) {
  const { title, discountPercentage } = req.query || {};
  const code = await generateUniqueOfferCode(title || "SGT", Number(discountPercentage) || 50);
  return res.json({
    success: true,
    code,
  });
}

// Admin: Create Offer Code (percentage discount up to 100%, usage limits)
export async function createOfferCode(req, res) {
  const {
    code,
    title,
    discountType,
    discountPercentage,
    discount499,
    discount999,
    maxUses,
    applicablePlans,
    notes,
  } = req.body || {};

  const result = await createOfferCodeAdmin({
    code,
    title,
    discountType,
    discountPercentage,
    discount499,
    discount999,
    maxUses,
    applicablePlans,
    notes,
    adminId: req.admin?.id,
  });

  return res.status(201).json({
    success: true,
    offerCode: result,
    message: `Offer code "${result.code}" created successfully!`,
  });
}

// Admin: List Offer Codes
export async function listOfferCodes(req, res) {
  const result = await listOfferCodesAdmin();
  return res.json({
    success: true,
    ...result,
  });
}

// Admin: Toggle Offer Code status
export async function toggleOfferCodeStatus(req, res) {
  const result = await toggleOfferCodeStatusAdmin(req.params.id);
  return res.json({
    success: true,
    offerCode: result,
    message: `Offer code is now ${result.isActive ? "ACTIVE" : "INACTIVE"}.`,
  });
}

// Admin: Delete Offer Code
export async function deleteOfferCode(req, res) {
  const result = await deleteOfferCodeAdmin(req.params.id);
  return res.json({
    success: true,
    ...result,
  });
}

// Admin: Get Offer Code Conversions
export async function getOfferCodeConversions(req, res) {
  const result = await getPromoConversionsAdmin(req.params.id);
  return res.json({
    success: true,
    ...result,
  });
}

// Admin: Influencers endpoints
export async function createInfluencer(req, res) {
  const {
    influencerName,
    influencerEmail,
    customCode,
    notes,
    discount499,
    discount999,
  } = req.body || {};

  const result = await createInfluencerPromoAdmin({
    influencerName,
    influencerEmail,
    customCode,
    notes,
    discount499,
    discount999,
    adminId: req.admin?.id,
  });

  return res.status(201).json({
    success: true,
    influencer: result,
  });
}

export async function listInfluencers(req, res) {
  const result = await listInfluencersAdmin();
  return res.json({
    success: true,
    ...result,
  });
}

export async function getInfluencerConversions(req, res) {
  const result = await getPromoConversionsAdmin(req.params.influencerId);
  return res.json({
    success: true,
    ...result,
  });
}

export async function toggleInfluencerStatus(req, res) {
  const result = await toggleInfluencerStatusAdmin(req.params.influencerId);
  return res.json({
    success: true,
    influencer: result,
  });
}
