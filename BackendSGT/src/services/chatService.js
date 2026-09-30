import mongoose from "mongoose";
import Match from "../models/Match.js";
import MatchSession from "../models/MatchSession.js";
import Message from "../models/Message.js";
import Profile from "../models/Profile.js";
import QuestionnaireResponse from "../models/QuestionnaireResponse.js";

function invalid(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/**
 * Validate that match exists, is ACTIVE, and userId is one of the participants.
 */
async function getVerifiedMatch(userId, matchId) {
  if (!mongoose.Types.ObjectId.isValid(matchId)) {
    throw invalid("Invalid match identifier.", 400);
  }

  const match = await Match.findOne({
    _id: matchId,
    $or: [{ user1Id: userId }, { user2Id: userId }],
    status: "ACTIVE",
  });

  if (!match) {
    throw invalid("Active match not found or you are not a participant in this match.", 404);
  }

  const isUser1 = match.user1Id.toString() === userId.toString();
  const partnerId = isUser1 ? match.user2Id : match.user1Id;

  return { match, isUser1, partnerId };
}

/**
 * Get messages and reveal state for a match.
 */
export async function getConversation(userId, matchId) {
  const { match, isUser1, partnerId } = await getVerifiedMatch(userId, matchId);

  // Mark incoming unread messages as read
  await Message.updateMany(
    { matchId, recipientId: userId, isRead: false },
    { $set: { isRead: true } },
  );

  const [messages, partnerProfile, partnerQuest] = await Promise.all([
    Message.find({ matchId }).sort({ createdAt: 1 }).lean(),
    Profile.findOne({ userId: partnerId }).populate("institutionId", "name shortName city").lean(),
    QuestionnaireResponse.findOne({ userId: partnerId }).select("tags").lean(),
  ]);

  const isRevealed = Boolean(match.isRevealed);
  const myRevealed = isUser1 ? Boolean(match.user1Revealed) : Boolean(match.user2Revealed);
  const partnerRevealed = isUser1 ? Boolean(match.user2Revealed) : Boolean(match.user1Revealed);

  const partnerFullName = partnerProfile?.fullName || "Student";
  const partnerFirstName = partnerFullName.trim().split(" ")[0] || "Match";
  const partnerInitials = partnerFullName
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2);

  return {
    matchId: match._id,
    compatibilityScore: match.compatibilityScore,
    synthesis: match.synthesis || {},
    isRevealed,
    myRevealed,
    partnerRevealed,
    revealedAt: match.revealedAt,
    partner: {
      id: partnerId,
      firstName: partnerFirstName,
      initials: partnerInitials,
      fullName: isRevealed ? partnerFullName : undefined,
      profilePhoto: isRevealed ? partnerProfile?.profilePhoto?.secureUrl || partnerProfile?.profilePhoto?.url : undefined,
      college: partnerProfile?.institutionId?.name || partnerProfile?.institutionId?.shortName || "Campus",
      course: partnerProfile?.course,
      academicYear: partnerProfile?.academicYear,
      gender: partnerProfile?.gender,
      tags: partnerQuest?.tags || [],
    },
    messages: messages.map((m) => ({
      id: m._id,
      senderId: m.senderId,
      isMine: m.senderId.toString() === userId.toString(),
      text: m.text,
      isRead: m.isRead,
      createdAt: m.createdAt,
    })),
  };
}

/**
 * Send a message in an active match.
 */
export async function sendMessage(userId, matchId, text) {
  const cleanText = typeof text === "string" ? text.trim() : "";
  if (!cleanText) {
    throw invalid("Message cannot be empty.", 400);
  }
  if (cleanText.length > 1200) {
    throw invalid("Message cannot exceed 1200 characters.", 400);
  }

  const { match, partnerId } = await getVerifiedMatch(userId, matchId);

  const message = await Message.create({
    matchId,
    senderId: userId,
    recipientId: partnerId,
    text: cleanText,
    isRead: false,
  });

  match.lastMessageAt = new Date();
  await match.save();

  return {
    id: message._id,
    senderId: message.senderId,
    isMine: true,
    text: message.text,
    isRead: message.isRead,
    createdAt: message.createdAt,
  };
}

/**
 * Request or confirm mutual profile reveal.
 */
export async function requestProfileReveal(userId, matchId) {
  const { match, isUser1, partnerId } = await getVerifiedMatch(userId, matchId);

  if (isUser1) {
    match.user1Revealed = true;
  } else {
    match.user2Revealed = true;
  }

  // Check if both sides have agreed to reveal
  if (match.user1Revealed && match.user2Revealed) {
    match.isRevealed = true;
    match.revealedAt = new Date();
  }

  await match.save();

  // Return full conversation status with updated reveal
  return getConversation(userId, matchId);
}

/**
 * Unmatch / decline current match.
 */
export async function unmatch(userId, matchId) {
  const { match } = await getVerifiedMatch(userId, matchId);

  match.status = "DECLINED";
  match.declinedBy = userId;
  match.declinedAt = new Date();
  await match.save();

  await MatchSession.updateOne(
    { userId },
    { $set: { status: "IDLE", nextRetryAt: null } },
  );

  return { success: true, message: "Match ended successfully." };
}
