import Match from "../models/Match.js";
import Profile from "../models/Profile.js";
import User from "../models/User.js";
import Message from "../models/Message.js";
import MatchSession from "../models/MatchSession.js";

function invalid(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export async function listAdminMatches({ status, search } = {}) {
  const matchFilter = {};

  if (status === "MUTUAL_PAIRED") {
    matchFilter.isRevealed = true;
    matchFilter.status = { $ne: "CANCELLED_BY_ADMIN" };
  } else if (status === "ACTIVE") {
    matchFilter.status = "ACTIVE";
    matchFilter.isRevealed = false;
  } else if (status === "DECLINED") {
    matchFilter.status = "DECLINED";
  } else if (status === "CANCELLED") {
    matchFilter.status = "CANCELLED_BY_ADMIN";
  }

  const matches = await Match.find(matchFilter)
    .populate("user1Id", "email isBlocked blockReason blockedAt")
    .populate("user2Id", "email isBlocked blockReason blockedAt")
    .populate("institutionId", "name shortName city")
    .sort({ matchedAt: -1 })
    .lean();

  const userIds = [];
  matches.forEach((m) => {
    if (m.user1Id?._id) userIds.push(m.user1Id._id);
    if (m.user2Id?._id) userIds.push(m.user2Id._id);
  });

  const profiles = await Profile.find({ userId: { $in: userIds } })
    .select(
      "userId fullName anonymousAlias studentId course academicYear gender profilePhoto activePlan paymentStatus revealedWithUserId",
    )
    .lean();

  const profileMap = new Map();
  profiles.forEach((p) => profileMap.set(String(p.userId), p));

  // Get message statistics per match
  const matchIds = matches.map((m) => m._id);
  const messageStats = await Message.aggregate([
    { $match: { matchId: { $in: matchIds } } },
    {
      $group: {
        _id: "$matchId",
        count: { $sum: 1 },
        lastMessage: { $last: "$ciphertext" },
        lastMessageAt: { $max: "$createdAt" },
      },
    },
  ]);

  const messageMap = new Map();
  messageStats.forEach((stat) => messageMap.set(String(stat._id), stat));

  let results = matches.map((m) => {
    const u1 = m.user1Id;
    const u2 = m.user2Id;
    const p1 = u1 ? profileMap.get(String(u1._id)) : null;
    const p2 = u2 ? profileMap.get(String(u2._id)) : null;
    const msgData = messageMap.get(String(m._id)) || { count: 0, lastMessage: null, lastMessageAt: null };

    return {
      _id: m._id,
      status: m.status,
      isRevealed: Boolean(m.isRevealed),
      revealedAt: m.revealedAt,
      user1Revealed: Boolean(m.user1Revealed),
      user2Revealed: Boolean(m.user2Revealed),
      compatibilityScore: m.compatibilityScore || 0,
      synthesisScore: m.synthesisScore,
      synthesis: m.synthesis,
      matchedAt: m.matchedAt,
      institution: m.institutionId,
      messageCount: msgData.count,
      lastMessageAt: msgData.lastMessageAt || m.lastMessageAt,
      user1: {
        _id: u1?._id,
        email: u1?.email || "Unknown",
        isBlocked: Boolean(u1?.isBlocked),
        blockReason: u1?.blockReason || "",
        fullName: p1?.fullName || "Anonymous Student",
        anonymousAlias: p1?.anonymousAlias || "Festival_Vibe",
        studentId: p1?.studentId || "N/A",
        course: p1?.course || "",
        academicYear: p1?.academicYear || "",
        gender: p1?.gender || "",
        profilePhoto: p1?.profilePhoto?.secureUrl || p1?.profilePhoto?.url || null,
        activePlan: p1?.activePlan || "none",
        paymentStatus: p1?.paymentStatus || "UNPAID",
      },
      user2: {
        _id: u2?._id,
        email: u2?.email || "Unknown",
        isBlocked: Boolean(u2?.isBlocked),
        blockReason: u2?.blockReason || "",
        fullName: p2?.fullName || "Anonymous Student",
        anonymousAlias: p2?.anonymousAlias || "Festival_Vibe",
        studentId: p2?.studentId || "N/A",
        course: p2?.course || "",
        academicYear: p2?.academicYear || "",
        gender: p2?.gender || "",
        profilePhoto: p2?.profilePhoto?.secureUrl || p2?.profilePhoto?.url || null,
        activePlan: p2?.activePlan || "none",
        paymentStatus: p2?.paymentStatus || "UNPAID",
      },
    };
  });

  // Client-specified search filtering
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    results = results.filter((item) => {
      const u1Email = item.user1.email.toLowerCase();
      const u2Email = item.user2.email.toLowerCase();
      const u1Name = item.user1.fullName.toLowerCase();
      const u2Name = item.user2.fullName.toLowerCase();
      const u1Alias = item.user1.anonymousAlias.toLowerCase();
      const u2Alias = item.user2.anonymousAlias.toLowerCase();
      const u1Id = item.user1.studentId.toLowerCase();
      const u2Id = item.user2.studentId.toLowerCase();
      const college = (item.institution?.name || "").toLowerCase();

      return (
        u1Email.includes(q) ||
        u2Email.includes(q) ||
        u1Name.includes(q) ||
        u2Name.includes(q) ||
        u1Alias.includes(q) ||
        u2Alias.includes(q) ||
        u1Id.includes(q) ||
        u2Id.includes(q) ||
        college.includes(q)
      );
    });
  }

  return results;
}

export async function nullifyMatchAdmin(matchId, adminId, reason) {
  const match = await Match.findById(matchId);
  if (!match) throw invalid("Match record not found.", 404);

  match.status = "CANCELLED_BY_ADMIN";
  match.declinedAt = new Date();
  await match.save();

  // Reset mutual reveal linkage on profiles
  await Profile.updateMany(
    { userId: { $in: [match.user1Id, match.user2Id] } },
    { $set: { revealedWithUserId: null } },
  );

  // Reset match sessions to idle so users can re-match or take new actions
  await MatchSession.updateMany(
    { userId: { $in: [match.user1Id, match.user2Id] } },
    { $set: { status: "IDLE", attempt: 1 } },
  );

  return {
    success: true,
    message: "Match successfully nullified and partner linkages cleared.",
  };
}

export async function unpairMatchAdmin(matchId, adminId) {
  const match = await Match.findById(matchId);
  if (!match) throw invalid("Match record not found.", 404);

  match.isRevealed = false;
  match.user1Revealed = false;
  match.user2Revealed = false;
  match.revealedAt = null;
  await match.save();

  // Reset mutual reveal linkage on profiles
  await Profile.updateMany(
    { userId: { $in: [match.user1Id, match.user2Id] } },
    { $set: { revealedWithUserId: null } },
  );

  return {
    success: true,
    message: "Mutual reveal status unpaired. Users are returned to anonymous chat.",
  };
}

export async function blockUserAdmin(userId, reason) {
  const user = await User.findById(userId);
  if (!user) throw invalid("User not found.", 404);

  user.isBlocked = true;
  user.blockReason = reason || "Suspended by Administrator";
  user.blockedAt = new Date();
  await user.save();

  // Cancel any active matches involving this user
  const activeMatches = await Match.find({
    $or: [{ user1Id: user._id }, { user2Id: user._id }],
    status: { $in: ["ACTIVE", "SEARCHING"] },
  });

  for (const match of activeMatches) {
    match.status = "CANCELLED_BY_ADMIN";
    await match.save();
    // Clear linkage on partner profile
    const partnerId = String(match.user1Id) === String(user._id) ? match.user2Id : match.user1Id;
    await Profile.updateOne({ userId: partnerId }, { $set: { revealedWithUserId: null } });
    await MatchSession.updateOne({ userId: partnerId }, { $set: { status: "IDLE", attempt: 1 } });
  }

  await Profile.updateOne({ userId: user._id }, { $set: { revealedWithUserId: null } });
  await MatchSession.updateOne({ userId: user._id }, { $set: { status: "IDLE", attempt: 1 } });

  return {
    success: true,
    message: `Account for ${user.email} has been blocked and active matches nullified.`,
  };
}

export async function unblockUserAdmin(userId) {
  const user = await User.findById(userId);
  if (!user) throw invalid("User not found.", 404);

  user.isBlocked = false;
  user.blockReason = "";
  user.blockedAt = null;
  await user.save();

  return {
    success: true,
    message: `Account for ${user.email} has been unblocked.`,
  };
}

export async function blockUserByEmailAdmin(email, reason) {
  const normalizedEmail = (email || "").trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) throw invalid(`No user account found with email "${normalizedEmail}".`, 404);

  return blockUserAdmin(user._id, reason);
}
