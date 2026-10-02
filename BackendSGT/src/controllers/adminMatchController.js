import {
  listAdminMatches,
  nullifyMatchAdmin,
  unpairMatchAdmin,
  blockUserAdmin,
  unblockUserAdmin,
  blockUserByEmailAdmin,
  unblockUserByEmailAdmin,
  listSuspendedUsersAdmin,
  listStudentsForManualPairingAdmin,
  getCandidatePartnersAdmin,
  createManualPairAdmin,
  getDualGenderPoolAdmin,
} from "../services/adminMatchService.js";

export async function listMatches(req, res) {
  const { status, search } = req.query;
  const matches = await listAdminMatches({ status, search });
  return res.json({
    success: true,
    matches,
  });
}

export async function getDualGenderPool(req, res) {
  const result = await getDualGenderPoolAdmin();
  return res.json(result);
}

export async function listStudentsForManualPair(req, res) {
  const { search, gender, excludeUserId } = req.query;
  const students = await listStudentsForManualPairingAdmin({
    search,
    gender,
    excludeUserId,
  });
  return res.json({
    success: true,
    students,
  });
}

export async function getCandidatePartners(req, res) {
  const result = await getCandidatePartnersAdmin(req.params.userId);
  return res.json({
    success: true,
    ...result,
  });
}

export async function createManualPair(req, res) {
  const { user1Id, user2Id, instantReveal, customHeadline } = req.body || {};
  const result = await createManualPairAdmin({
    user1Id,
    user2Id,
    instantReveal,
    customHeadline,
    adminId: req.admin.id,
  });
  return res.json(result);
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

export async function unblockUserByEmail(req, res) {
  const { email } = req.body || {};
  const result = await unblockUserByEmailAdmin(email);
  return res.json(result);
}

export async function listSuspendedUsers(req, res) {
  const users = await listSuspendedUsersAdmin();
  return res.json({
    success: true,
    users,
  });
}
