import {
  getConversation,
  getAllConversations,
  sendMessage,
  requestProfileReveal,
  unmatch,
} from "../services/chatService.js";

export async function getAllMatchConversations(req, res) {
  const data = await getAllConversations(req.user._id);
  return res.json({
    success: true,
    ...data,
  });
}

export async function getMatchChat(req, res) {
  const { matchId } = req.params;
  const data = await getConversation(req.user._id, matchId);
  return res.json({
    success: true,
    ...data,
  });
}

export async function sendChatMessage(req, res) {
  const { matchId } = req.params;
  const { text } = req.body || {};
  const message = await sendMessage(req.user._id, matchId, text);
  return res.status(201).json({
    success: true,
    message,
  });
}

export async function revealProfile(req, res) {
  const { matchId } = req.params;
  const data = await requestProfileReveal(req.user._id, matchId);
  return res.json({
    success: true,
    ...data,
  });
}

export async function endMatch(req, res) {
  const { matchId } = req.params;
  const data = await unmatch(req.user._id, matchId);
  return res.json({
    success: true,
    ...data,
  });
}
