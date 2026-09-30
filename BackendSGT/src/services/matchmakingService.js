import Match from "../models/Match.js";
import MatchSession from "../models/MatchSession.js";
import Profile from "../models/Profile.js";
import QuestionnaireResponse from "../models/QuestionnaireResponse.js";
import User from "../models/User.js";
import VerificationApplication from "../models/VerificationApplication.js";
import { synthesizeCompatibility } from "./geminiMatchSynthesisService.js";

const COOLDOWN_SECONDS = 60;

function invalid(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function calculateQ1toQ8Score(userFeatures, candFeatures) {
  const userNum = userFeatures?.numericTraits || {};
  const candNum = candFeatures?.numericTraits || {};
  const userCat = userFeatures?.categoricalTraits || {};
  const candCat = candFeatures?.categoricalTraits || {};

  // Trait differences (0 to 1 scale)
  const diffs = [
    Math.abs((userNum.social_energy || 0.5) - (candNum.social_energy || 0.5)),
    Math.abs((userNum.social_preference || 0.5) - (candNum.social_preference || 0.5)),
    Math.abs((userNum.adaptability || 0.5) - (candNum.adaptability || 0.5)),
    Math.abs((userNum.adventure || 0.5) - (candNum.adventure || 0.5)),
    Math.abs((userNum.dance_energy || 0.5) - (candNum.dance_energy || 0.5)),
    Math.abs((userNum.group_social_energy || 0.5) - (candNum.group_social_energy || 0.5)),
  ];

  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  let score = (1 - avgDiff) * 75; // Baseline math score up to 75

  // Categorical alignments (Q5 shared_activity & Q7 music_style)
  if (userCat.shared_activity && userCat.shared_activity === candCat.shared_activity) {
    score += 12;
  }
  if (userCat.music_style && userCat.music_style === candCat.music_style) {
    score += 13;
  }

  return Math.min(96, Math.max(65, Math.round(score)));
}

export async function serializeAnonymousMatch(matchDoc, currentUserId) {
  if (!matchDoc) return null;

  const isUser1 = matchDoc.user1Id.toString() === currentUserId.toString();
  const partnerId = isUser1 ? matchDoc.user2Id : matchDoc.user1Id;

  const [partnerProfile, partnerQuest] = await Promise.all([
    Profile.findOne({ userId: partnerId }).populate("institutionId", "name shortName city").lean(),
    QuestionnaireResponse.findOne({ userId: partnerId }).select("tags").lean(),
  ]);

  if (!partnerProfile) return null;

  const isRevealed = Boolean(matchDoc.isRevealed);
  const myRevealed = isUser1 ? Boolean(matchDoc.user1Revealed) : Boolean(matchDoc.user2Revealed);
  const partnerRevealed = isUser1 ? Boolean(matchDoc.user2Revealed) : Boolean(matchDoc.user1Revealed);

  const partnerAlias = partnerProfile.anonymousAlias || "Dandiya_Match";
  const fullName = partnerProfile.fullName || "Student";
  const initials = partnerAlias.slice(0, 2).toUpperCase();

  return {
    matchId: matchDoc._id,
    status: matchDoc.status,
    matchedAt: matchDoc.matchedAt,
    compatibilityScore: matchDoc.compatibilityScore,
    synthesis: matchDoc.synthesis || {},
    isRevealed,
    myRevealed,
    partnerRevealed,
    revealedAt: matchDoc.revealedAt,
    partner: {
      id: partnerId,
      alias: partnerAlias,
      firstName: isRevealed ? (fullName.split(" ")[0] || "Match") : partnerAlias,
      initials: isRevealed ? (fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "SGT") : initials,
      fullName: isRevealed ? fullName : undefined,
      profilePhoto: isRevealed ? partnerProfile.profilePhoto?.secureUrl || partnerProfile.profilePhoto?.url : undefined,
      gender: partnerProfile.gender,
      course: partnerProfile.course,
      academicYear: partnerProfile.academicYear,
      college: partnerProfile.institutionId?.shortName || partnerProfile.institutionId?.name || "Campus",
      city: partnerProfile.institutionId?.city,
      tags: partnerQuest?.tags || [],
    },
  };
}

export async function getSessionStatus(userId) {
  let session = await MatchSession.findOne({ userId });
  if (!session) {
    session = await MatchSession.create({ userId, status: "IDLE" });
  }

  // Check if cooldown has expired
  if (session.status === "WAITING_RETRY" && session.nextRetryAt) {
    const remainingSeconds = Math.ceil((new Date(session.nextRetryAt).getTime() - Date.now()) / 1000);
    if (remainingSeconds <= 0) {
      session.status = "IDLE";
      session.nextRetryAt = null;
      await session.save();
    }
  }

  // Check if an active match exists
  const activeMatch = await Match.findOne({
    $or: [{ user1Id: userId }, { user2Id: userId }],
    status: "ACTIVE",
  });

  if (activeMatch && session.status !== "MATCHED") {
    session.status = "MATCHED";
    await session.save();
  }

  const cooldownSeconds =
    session.status === "WAITING_RETRY" && session.nextRetryAt
      ? Math.max(0, Math.ceil((new Date(session.nextRetryAt).getTime() - Date.now()) / 1000))
      : 0;

  return {
    status: session.status,
    attempt: session.attempt,
    cooldownSeconds,
    nextRetryAt: session.nextRetryAt,
    hasActiveMatch: Boolean(activeMatch),
  };
}

export async function getCurrentMatch(userId) {
  const activeMatch = await Match.findOne({
    $or: [{ user1Id: userId }, { user2Id: userId }],
    status: "ACTIVE",
  });

  if (!activeMatch) return null;
  return serializeAnonymousMatch(activeMatch, userId);
}

export async function findOrGenerateMatch(userId) {
  // 1. Check if user already has an active match
  const existingActive = await Match.findOne({
    $or: [{ user1Id: userId }, { user2Id: userId }],
    status: "ACTIVE",
  });

  if (existingActive) {
    return {
      status: "MATCHED",
      match: await serializeAnonymousMatch(existingActive, userId),
    };
  }

  // 2. Check MatchSession / cooldown
  let session = await MatchSession.findOne({ userId });
  if (!session) {
    session = await MatchSession.create({ userId, status: "SEARCHING", attempt: 1 });
  }

  if (session.status === "WAITING_RETRY" && session.nextRetryAt) {
    const remainingSeconds = Math.ceil((new Date(session.nextRetryAt).getTime() - Date.now()) / 1000);
    if (remainingSeconds > 0) {
      return {
        status: "WAITING_RETRY",
        attempt: session.attempt,
        cooldownSeconds: remainingSeconds,
        nextRetryAt: session.nextRetryAt,
        message: `Cooldown active. Please retry in ${remainingSeconds} seconds.`,
      };
    }
  }

  // Update session to active searching
  session.status = "SEARCHING";
  session.attempt = (session.attempt || 0) + 1;
  session.lastAttemptAt = new Date();
  await session.save();

  // 3. Check User Prerequisites (Verified + Questionnaire Complete + Paid)
  const userProfile = await Profile.findOne({ userId });
  if (!userProfile) {
    throw invalid("Profile not found. Please complete profile setup.", 404);
  }

  const application = await VerificationApplication.findOne({ userId });
  const isVerified =
    userProfile.verificationStatus === "VERIFIED" ||
    application?.verificationStatus === "VERIFIED";

  if (!isVerified) {
    throw invalid("Campus ID verification is required to participate in matchmaking.", 400);
  }

  if (userProfile.verificationStatus !== "VERIFIED") {
    userProfile.verificationStatus = "VERIFIED";
    await userProfile.save();
  }

  const userQuest = await QuestionnaireResponse.findOne({ userId });
  if (userProfile.questionnaireStatus !== "COMPLETED" && (!userQuest || !userQuest.features)) {
    throw invalid("Please complete your SGT questionnaire before finding a match.", 400);
  }

  if (userProfile.paymentStatus !== "PAID") {
    throw invalid("Active Dandiya Plan required to unlock matchmaking.", 400);
  }

  if (!userQuest || !userQuest.features) {
    throw invalid("Questionnaire features not found. Please resubmit questionnaire.", 400);
  }

  // 4. Query Eligible Candidates
  // Strict Male-Female pairing logic
  const genderQuery = {};
  if (userProfile.gender === "male") {
    genderQuery.gender = "female";
  } else if (userProfile.gender === "female") {
    genderQuery.gender = "male";
  } else {
    genderQuery.gender = { $in: ["male", "female", "non-binary"] };
  }

  // Existing match pairs to exclude
  const priorMatches = await Match.find({
    $or: [{ user1Id: userId }, { user2Id: userId }],
  }).select("user1Id user2Id status");

  const excludedUserIds = new Set([userId.toString()]);
  priorMatches.forEach((m) => {
    excludedUserIds.add(m.user1Id.toString());
    excludedUserIds.add(m.user2Id.toString());
  });

  const verifiedAppUserIds = await VerificationApplication.find({
    verificationStatus: "VERIFIED",
  }).distinct("userId");

  const verifiedSet = new Set(verifiedAppUserIds.map((id) => id.toString()));

  // Candidate query: same institution if available, then fallback to any university/organization
  let eligibleProfiles = await Profile.find({
    userId: { $nin: Array.from(excludedUserIds) },
    institutionId: userProfile.institutionId,
    $or: [
      { verificationStatus: "VERIFIED" },
      { userId: { $in: Array.from(verifiedSet) } },
    ],
    questionnaireStatus: "COMPLETED",
    paymentStatus: "PAID",
    ...genderQuery,
  })
    .limit(30)
    .lean();

  if ((!eligibleProfiles || eligibleProfiles.length === 0)) {
    eligibleProfiles = await Profile.find({
      userId: { $nin: Array.from(excludedUserIds) },
      $or: [
        { verificationStatus: "VERIFIED" },
        { userId: { $in: Array.from(verifiedSet) } },
      ],
      questionnaireStatus: "COMPLETED",
      paymentStatus: "PAID",
      ...genderQuery,
    })
      .limit(30)
      .lean();
  }

  if (!eligibleProfiles || eligibleProfiles.length === 0) {
    // No match candidate found in current batch -> Enter WAITING_RETRY (60s)
    session.status = "WAITING_RETRY";
    session.nextRetryAt = new Date(Date.now() + COOLDOWN_SECONDS * 1000);
    await session.save();

    return {
      status: "WAITING_RETRY",
      attempt: session.attempt,
      cooldownSeconds: COOLDOWN_SECONDS,
      nextRetryAt: session.nextRetryAt,
      message: "Scanning the campus pool. New participants join frequently — next retry in 60s.",
    };
  }

  // 5. Fetch candidate questionnaire features & calculate deterministic Q1–Q8 scores
  const candidateUserIds = eligibleProfiles.map((p) => p.userId);
  const candidateQuests = await QuestionnaireResponse.find({
    userId: { $in: candidateUserIds },
  }).lean();

  const questMap = new Map(candidateQuests.map((q) => [q.userId.toString(), q]));

  const scoredCandidates = [];
  for (const prof of eligibleProfiles) {
    const candQuest = questMap.get(prof.userId.toString());
    if (!candQuest || !candQuest.features) continue;

    const deterministicScore = calculateQ1toQ8Score(userQuest.features, candQuest.features);

    // Build Q9 and Q10 answer lookups
    const answersMap = {};
    (candQuest.answers || []).forEach((a) => {
      answersMap[a.questionId] = a.optionText;
    });

    scoredCandidates.push({
      userId: prof.userId,
      profile: prof,
      deterministicScore,
      tags: candQuest.tags || [],
      numericTraits: candQuest.features?.numericTraits || {},
      categoricalTraits: candQuest.features?.categoricalTraits || {},
      answers: answersMap,
    });
  }

  if (scoredCandidates.length === 0) {
    session.status = "WAITING_RETRY";
    session.nextRetryAt = new Date(Date.now() + COOLDOWN_SECONDS * 1000);
    await session.save();

    return {
      status: "WAITING_RETRY",
      attempt: session.attempt,
      cooldownSeconds: COOLDOWN_SECONDS,
      nextRetryAt: session.nextRetryAt,
      message: "Refining compatibility scores. Please retry in 60 seconds.",
    };
  }

  // Sort candidates by deterministic score descending
  scoredCandidates.sort((a, b) => b.deterministicScore - a.deterministicScore);

  // Take the TOP 5 candidates for Gemini evaluation
  const top5Candidates = scoredCandidates.slice(0, 5);

  // 6. Gemini Compatibility Synthesis (Refining Shortlist based on Q9 & Q10)
  session.status = "AI_EVALUATING";
  await session.save();

  const userAnswersMap = {};
  (userQuest.answers || []).forEach((a) => {
    userAnswersMap[a.questionId] = a.optionText;
  });

  const userSynthesisPayload = {
    userId,
    tags: userQuest.tags || [],
    numericTraits: userQuest.features?.numericTraits || {},
    categoricalTraits: userQuest.features?.categoricalTraits || {},
    answers: userAnswersMap,
  };

  const synthesisResult = await synthesizeCompatibility(userSynthesisPayload, top5Candidates);

  if (!synthesisResult) {
    session.status = "WAITING_RETRY";
    session.nextRetryAt = new Date(Date.now() + COOLDOWN_SECONDS * 1000);
    await session.save();

    return {
      status: "WAITING_RETRY",
      attempt: session.attempt,
      cooldownSeconds: COOLDOWN_SECONDS,
      nextRetryAt: session.nextRetryAt,
      message: "AI evaluation timed out. Please retry in 60 seconds.",
    };
  }

  const bestCandidate =
    top5Candidates.find((c) => c.userId.toString() === synthesisResult.selectedCandidateId) ||
    top5Candidates[0];

  // Final blended score (40% deterministic math + 60% Gemini Q9/Q10 synthesis)
  const finalScore = Math.min(
    99,
    Math.max(
      70,
      Math.round(bestCandidate.deterministicScore * 0.4 + synthesisResult.synthesisScore * 0.6),
    ),
  );

  // 7. Atomic Match Creation
  const newMatch = await Match.create({
    user1Id: userId,
    user2Id: bestCandidate.userId,
    institutionId: userProfile.institutionId,
    status: "ACTIVE",
    compatibilityScore: finalScore,
    deterministicScore: bestCandidate.deterministicScore,
    synthesisScore: synthesisResult.synthesisScore,
    synthesis: {
      matchHeadline: synthesisResult.matchHeadline,
      connectionNarrative: synthesisResult.connectionNarrative,
      sharedVibe: synthesisResult.sharedVibe,
      icebreakerPrompt: synthesisResult.icebreakerPrompt,
    },
    matchedAt: new Date(),
  });

  // Update session
  session.status = "MATCHED";
  session.nextRetryAt = null;
  await session.save();

  const anonymousMatch = await serializeAnonymousMatch(newMatch, userId);

  return {
    status: "MATCHED",
    match: anonymousMatch,
  };
}

export async function declineMatch(userId, matchId) {
  const match = await Match.findOne({
    _id: matchId,
    $or: [{ user1Id: userId }, { user2Id: userId }],
    status: "ACTIVE",
  });

  if (!match) {
    throw new Error("Active match not found or already closed.");
  }

  match.status = "DECLINED";
  match.declinedBy = userId;
  match.declinedAt = new Date();
  await match.save();

  // Reset user's session to IDLE so they can search again
  await MatchSession.findOneAndUpdate(
    { userId },
    { status: "IDLE", nextRetryAt: null },
    { upsert: true },
  );

  return { success: true, message: "Match declined. You can start a new search." };
}
