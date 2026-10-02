import Match from "../models/Match.js";
import Profile from "../models/Profile.js";
import User from "../models/User.js";
import Message from "../models/Message.js";
import MatchSession from "../models/MatchSession.js";
import QuestionnaireResponse from "../models/QuestionnaireResponse.js";
import { generateAnonymousAlias } from "../utils/aliasGenerator.js";

function invalid(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function calculateCompatibility(quest1, quest2) {
  if (!quest1 || !quest2) return 84;

  const num1 = quest1.numericTraits || {};
  const num2 = quest2.numericTraits || {};
  const cat1 = quest1.categoricalTraits || {};
  const cat2 = quest2.categoricalTraits || {};

  const diffs = [
    Math.abs((num1.social_energy || 0.5) - (num2.social_energy || 0.5)),
    Math.abs((num1.social_preference || 0.5) - (num2.social_preference || 0.5)),
    Math.abs((num1.adaptability || 0.5) - (num2.adaptability || 0.5)),
    Math.abs((num1.adventure || 0.5) - (num2.adventure || 0.5)),
    Math.abs((num1.dance_energy || 0.5) - (num2.dance_energy || 0.5)),
    Math.abs((num1.group_social_energy || 0.5) - (num2.group_social_energy || 0.5)),
  ];

  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  let score = (1 - avgDiff) * 75;

  if (cat1.shared_activity && cat1.shared_activity === cat2.shared_activity) {
    score += 12;
  }
  if (cat1.music_style && cat1.music_style === cat2.music_style) {
    score += 13;
  }

  return Math.min(98, Math.max(68, Math.round(score)));
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

export async function unblockUserByEmailAdmin(email) {
  const normalizedEmail = (email || "").trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) throw invalid(`No user account found with email "${normalizedEmail}".`, 404);

  return unblockUserAdmin(user._id);
}

export async function listSuspendedUsersAdmin() {
  const users = await User.find({ isBlocked: true })
    .select("email isBlocked blockReason blockedAt createdAt")
    .sort({ blockedAt: -1 })
    .lean();

  const userIds = users.map((u) => u._id);
  const profiles = await Profile.find({ userId: { $in: userIds } })
    .select("userId fullName anonymousAlias studentId institutionId course academicYear")
    .populate("institutionId", "name shortName")
    .lean();

  const profileMap = new Map();
  profiles.forEach((p) => profileMap.set(String(p.userId), p));

  return users.map((u) => {
    const pr = profileMap.get(String(u._id));
    return {
      _id: u._id,
      email: u.email,
      blockReason: u.blockReason,
      blockedAt: u.blockedAt,
      fullName: pr?.fullName || "Not provided",
      anonymousAlias: pr?.anonymousAlias || "Festival_Vibe",
      studentId: pr?.studentId || "N/A",
      collegeName: pr?.institutionId?.name || "Campus",
      course: pr?.course || "",
      academicYear: pr?.academicYear || "",
    };
  });
}

/**
 * Lists all verified students for selection in Admin Manual Pairing
 */
export async function listStudentsForManualPairingAdmin({ search, gender, excludeUserId } = {}) {
  const profileFilter = {
    verificationStatus: "VERIFIED",
  };

  if (gender && ["female", "male"].includes(gender)) {
    profileFilter.gender = gender;
  }

  if (excludeUserId) {
    profileFilter.userId = { $ne: excludeUserId };
  }

  const profiles = await Profile.find(profileFilter)
    .populate("userId", "email isBlocked")
    .populate("institutionId", "name shortName city")
    .sort({ fullName: 1 })
    .lean();

  const userIds = profiles.map((p) => p.userId?._id).filter(Boolean);

  // Check active matches for each user
  const activeMatches = await Match.find({
    $or: [{ user1Id: { $in: userIds } }, { user2Id: { $in: userIds } }],
    status: "ACTIVE",
  }).lean();

  const activeMatchUserSet = new Set();
  activeMatches.forEach((m) => {
    if (m.user1Id) activeMatchUserSet.add(String(m.user1Id));
    if (m.user2Id) activeMatchUserSet.add(String(m.user2Id));
  });

  let results = profiles
    .filter((p) => p.userId && !p.userId.isBlocked)
    .map((p) => ({
      _id: p._id,
      userId: p.userId._id,
      email: p.userId.email,
      fullName: p.fullName || "Student",
      anonymousAlias: p.anonymousAlias || "Festival_Vibe",
      studentId: p.studentId || "N/A",
      gender: p.gender || "prefer-not-to-say",
      course: p.course || "",
      academicYear: p.academicYear ? `Year ${p.academicYear}` : "",
      collegeName: p.institutionId?.name || "University Campus",
      collegeShort: p.institutionId?.shortName || p.institutionId?.name || "Campus",
      profilePhoto: p.profilePhoto?.secureUrl || p.profilePhoto?.url || null,
      paymentStatus: p.paymentStatus || "UNPAID",
      activePlan: p.activePlan || "none",
      isRevealedWithPartner: Boolean(p.revealedWithUserId),
      hasActiveMatch: activeMatchUserSet.has(String(p.userId._id)),
    }));

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    results = results.filter(
      (s) =>
        s.email.toLowerCase().includes(q) ||
        s.fullName.toLowerCase().includes(q) ||
        s.anonymousAlias.toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q) ||
        s.collegeName.toLowerCase().includes(q),
    );
  }

  return results;
}

/**
 * Returns eligible opposite-gender candidate partners ranked by compatibility
 */
export async function getCandidatePartnersAdmin(userId) {
  const primaryProfile = await Profile.findOne({ userId })
    .populate("userId", "email isBlocked")
    .populate("institutionId", "name shortName city")
    .lean();

  if (!primaryProfile) throw invalid("Primary student profile not found.", 404);

  const primaryGender = primaryProfile.gender;
  let targetGender = null;
  if (primaryGender === "female") targetGender = "male";
  else if (primaryGender === "male") targetGender = "female";

  const candidateFilter = {
    userId: { $ne: primaryProfile.userId._id },
    verificationStatus: "VERIFIED",
  };

  if (targetGender) {
    candidateFilter.gender = targetGender;
  }

  const [candidatesProfiles, primaryQuest] = await Promise.all([
    Profile.find(candidateFilter)
      .populate("userId", "email isBlocked")
      .populate("institutionId", "name shortName city")
      .lean(),
    QuestionnaireResponse.findOne({ userId }).lean(),
  ]);

  const candidateUserIds = candidatesProfiles
    .map((c) => c.userId?._id)
    .filter(Boolean);

  const [candidatesQuests, existingMatches] = await Promise.all([
    QuestionnaireResponse.find({ userId: { $in: candidateUserIds } }).lean(),
    Match.find({
      $or: [
        { user1Id: { $in: candidateUserIds } },
        { user2Id: { $in: candidateUserIds } },
      ],
      status: "ACTIVE",
    }).lean(),
  ]);

  const questMap = new Map();
  candidatesQuests.forEach((q) => questMap.set(String(q.userId), q));

  const activeMatchUserSet = new Set();
  existingMatches.forEach((m) => {
    if (m.user1Id) activeMatchUserSet.add(String(m.user1Id));
    if (m.user2Id) activeMatchUserSet.add(String(m.user2Id));
  });

  const ranked = candidatesProfiles
    .filter((c) => c.userId && !c.userId.isBlocked)
    .map((c) => {
      const cQuest = questMap.get(String(c.userId._id));
      const compatScore = calculateCompatibility(primaryQuest, cQuest);

      // Extract shared tags
      const pTags = new Set(primaryQuest?.tags || []);
      const cTags = cQuest?.tags || [];
      const sharedTags = cTags.filter((t) => pTags.has(t));

      return {
        _id: c._id,
        userId: c.userId._id,
        email: c.userId.email,
        fullName: c.fullName || "Student",
        anonymousAlias: c.anonymousAlias || "Festival_Vibe",
        studentId: c.studentId || "N/A",
        gender: c.gender || "prefer-not-to-say",
        course: c.course || "",
        academicYear: c.academicYear ? `Year ${c.academicYear}` : "",
        collegeName: c.institutionId?.name || "University Campus",
        collegeShort: c.institutionId?.shortName || c.institutionId?.name || "Campus",
        profilePhoto: c.profilePhoto?.secureUrl || c.profilePhoto?.url || null,
        paymentStatus: c.paymentStatus || "UNPAID",
        activePlan: c.activePlan || "none",
        compatibilityScore: compatScore,
        sharedTags,
        hasActiveMatch: activeMatchUserSet.has(String(c.userId._id)),
        isRevealedWithPartner: Boolean(c.revealedWithUserId),
      };
    });

  // Sort by compatibility descending
  ranked.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  return {
    primaryStudent: {
      userId: primaryProfile.userId._id,
      email: primaryProfile.userId.email,
      fullName: primaryProfile.fullName || "Student",
      anonymousAlias: primaryProfile.anonymousAlias || "Festival_Vibe",
      gender: primaryProfile.gender || "prefer-not-to-say",
      studentId: primaryProfile.studentId || "N/A",
      collegeName: primaryProfile.institutionId?.name || "University Campus",
      course: primaryProfile.course || "",
      academicYear: primaryProfile.academicYear ? `Year ${primaryProfile.academicYear}` : "",
      profilePhoto: primaryProfile.profilePhoto?.secureUrl || primaryProfile.profilePhoto?.url || null,
      isRevealedWithPartner: Boolean(primaryProfile.revealedWithUserId),
    },
    targetGender,
    candidates: ranked,
  };
}

/**
 * Creates or activates a manual match between two students
 */
export async function createManualPairAdmin({
  user1Id,
  user2Id,
  instantReveal = false,
  customHeadline = "",
  adminId,
} = {}) {
  if (!user1Id || !user2Id) throw invalid("Both student IDs are required for pairing.", 400);
  if (String(user1Id) === String(user2Id)) throw invalid("Cannot pair a student with themselves.", 400);

  const [u1, u2, p1, p2, q1, q2] = await Promise.all([
    User.findById(user1Id),
    User.findById(user2Id),
    Profile.findOne({ userId: user1Id }),
    Profile.findOne({ userId: user2Id }),
    QuestionnaireResponse.findOne({ userId: user1Id }),
    QuestionnaireResponse.findOne({ userId: user2Id }),
  ]);

  if (!u1 || !u2) throw invalid("One or both user accounts not found.", 404);
  if (!p1 || !p2) throw invalid("One or both student profiles not found.", 404);

  if (u1.isBlocked || u2.isBlocked) {
    throw invalid("Cannot pair a suspended user account.", 400);
  }

  // Ensure festive aliases
  if (!p1.anonymousAlias) {
    p1.anonymousAlias = generateAnonymousAlias();
    await p1.save();
  }
  if (!p2.anonymousAlias) {
    p2.anonymousAlias = generateAnonymousAlias();
    await p2.save();
  }

  const compatScore = calculateCompatibility(q1, q2);

  // Deactivate any existing active matches for both users
  await Match.updateMany(
    {
      $or: [
        { user1Id: { $in: [user1Id, user2Id] } },
        { user2Id: { $in: [user1Id, user2Id] } },
      ],
      status: "ACTIVE",
    },
    { $set: { status: "DECLINED", declinedAt: new Date() } },
  );

  const matchHeadline =
    customHeadline.trim() ||
    `Campus Garba Connection · ${p1.course || "Campus"} & ${p2.course || "Campus"}`;

  const synthesis = {
    matchHeadline,
    connectionNarrative: `Handcrafted Dandiya pairing curated by campus administration based on festive energy and dance vibes.`,
    sharedVibe: "Curated Campus Dandiya Duo",
    icebreakerPrompt: "Hey! We've been officially paired for Dandiya Night. Ready to sync beats?",
  };

  const isRevealed = Boolean(instantReveal);
  const now = new Date();

  // Create active match
  const match = await Match.create({
    user1Id,
    user2Id,
    institutionId: p1.institutionId || p2.institutionId || null,
    status: "ACTIVE",
    compatibilityScore: compatScore,
    deterministicScore: compatScore,
    synthesisScore: compatScore,
    synthesis,
    matchedAt: now,
    user1Revealed: isRevealed,
    user2Revealed: isRevealed,
    isRevealed,
    revealedAt: isRevealed ? now : null,
  });

  if (isRevealed) {
    p1.revealedWithUserId = user2Id;
    p2.revealedWithUserId = user1Id;
    await Promise.all([p1.save(), p2.save()]);
  }

  // Set match session to MATCHED for both
  await Promise.all([
    MatchSession.findOneAndUpdate(
      { userId: user1Id },
      { status: "MATCHED", currentMatchId: match._id, attempt: 1 },
      { upsert: true, new: true },
    ),
    MatchSession.findOneAndUpdate(
      { userId: user2Id },
      { status: "MATCHED", currentMatchId: match._id, attempt: 1 },
      { upsert: true, new: true },
    ),
  ]);

  return {
    success: true,
    message: `🎉 Successfully paired ${p1.fullName || p1.anonymousAlias} & ${p2.fullName || p2.anonymousAlias} for Dandiya!`,
    match: {
      _id: match._id,
      compatibilityScore: match.compatibilityScore,
      isRevealed: match.isRevealed,
      matchedAt: match.matchedAt,
    },
  };
}
