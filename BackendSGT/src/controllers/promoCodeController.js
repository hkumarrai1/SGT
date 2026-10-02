import {
  createInfluencerPromoAdmin,
  deleteInfluencerAdmin,
  generateUniquePromoCode,
  getInfluencerConversionsAdmin,
  listInfluencersAdmin,
  toggleInfluencerStatusAdmin,
  validatePromoCodeUser,
} from "../services/promoCodeService.js";

export async function validatePromoCode(req, res) {
  const { code, planId } = req.body || {};
  const result = await validatePromoCodeUser({ code, planId });
  return res.json({
    success: true,
    ...result,
  });
}

export async function previewUniqueCode(req, res) {
  const name = req.query.name || req.body.name;
  const code = await generateUniquePromoCode(name);
  return res.json({
    success: true,
    code,
  });
}

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

  return res.status(201).json(result);
}

export async function listInfluencers(req, res) {
  const result = await listInfluencersAdmin();
  return res.json(result);
}

export async function getInfluencerConversions(req, res) {
  const result = await getInfluencerConversionsAdmin(req.params.influencerId);
  return res.json(result);
}

export async function toggleInfluencerStatus(req, res) {
  const result = await toggleInfluencerStatusAdmin(req.params.influencerId);
  return res.json(result);
}

export async function deleteInfluencer(req, res) {
  const result = await deleteInfluencerAdmin(req.params.influencerId);
  return res.json(result);
}
