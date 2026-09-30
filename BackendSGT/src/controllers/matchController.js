import {
  findOrGenerateMatch,
  getCurrentMatch,
  getSessionStatus,
  declineMatch,
} from "../services/matchmakingService.js";

export async function findMatch(req, res) {
  const result = await findOrGenerateMatch(req.user._id);
  return res.json({
    success: true,
    ...result,
  });
}

export async function getActiveMatch(req, res) {
  const match = await getCurrentMatch(req.user._id);
  return res.json({
    success: true,
    match,
  });
}

export async function getMatchSession(req, res) {
  const session = await getSessionStatus(req.user._id);
  return res.json({
    success: true,
    session,
  });
}

export async function declineActiveMatch(req, res) {
  const { matchId } = req.params;
  const result = await declineMatch(req.user._id, matchId);
  return res.json({
    success: true,
    ...result,
  });
}
