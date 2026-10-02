import {
  listAdminMatches,
  nullifyMatchAdmin,
  unpairMatchAdmin,
  blockUserAdmin,
  unblockUserAdmin,
  blockUserByEmailAdmin,
} from "../services/adminMatchService.js";

export async function listMatches(req, res) {
  const { status, search } = req.query;
  const matches = await listAdminMatches({ status, search });
  return res.json({
    success: true,
    matches,
  });
}

export async function nullifyMatch(req, res) {
  const result = await nullifyMatchAdmin(
    req.params.matchId,
    req.admin.id,
    req.body?.reason,
  );
  return res.json(result);
}

export async function unpairMatch(req, res) {
  const result = await unpairMatchAdmin(req.params.matchId, req.admin.id);
  return res.json(result);
}

export async function blockUser(req, res) {
  const result = await blockUserAdmin(req.params.userId, req.body?.reason);
  return res.json(result);
}

export async function unblockUser(req, res) {
  const result = await unblockUserAdmin(req.params.userId);
  return res.json(result);
}

export async function blockUserByEmail(req, res) {
  const { email, reason } = req.body || {};
  const result = await blockUserByEmailAdmin(email, reason);
  return res.json(result);
}
