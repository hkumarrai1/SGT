import { getSanitizedQuestionnaire } from "../data/questionnaire.js";
import { env } from "../config/env.js";
import Profile from "../models/Profile.js";
import QuestionnaireResponse from "../models/QuestionnaireResponse.js";
import { getAuthoritativeStatus } from "../services/onboardingStatusService.js";
import {
  extractQuestionnaireFeatures,
  validateQuestionnaireAnswers,
} from "../services/questionnaireFeatureService.js";
import { generateProfileTags } from "../services/groqTaggingService.js";

function forbidden(message) {
  const error = new Error(message);
  error.statusCode = 403;
  return error;
}

function areAnswersIdentical(existingAnswers, newAnswers) {
  if (!Array.isArray(existingAnswers) || !Array.isArray(newAnswers)) return false;
  if (existingAnswers.length !== newAnswers.length) return false;
  return newAnswers.every((ans, idx) => {
    const existing = existingAnswers[idx];
    return (
      existing &&
      existing.questionId === ans.questionId &&
      existing.optionId === ans.optionId
    );
  });
}

async function requireQuestionnaireAccess(userId) {
  const state = await getAuthoritativeStatus(userId);
  if (state.verificationStatus !== "VERIFIED") {
    throw forbidden("Verification approval is required before questionnaire.");
  }
  return state;
}

export async function getQuestionnaire(req, res) {
  await requireQuestionnaireAccess(req.user._id);
  const existingResponse = await QuestionnaireResponse.findOne({
    userId: req.user._id,
  }).lean();
  return res.json({
    success: true,
    questions: getSanitizedQuestionnaire(),
    tags: existingResponse?.tags || [],
    isCompleted: Boolean(existingResponse),
  });
}

export async function submitQuestionnaire(req, res) {
  await requireQuestionnaireAccess(req.user._id);

  const answers = validateQuestionnaireAnswers(req.body?.answers);
  const features = extractQuestionnaireFeatures(answers);

  const existingResponse = await QuestionnaireResponse.findOne({
    userId: req.user._id,
  }).lean();

  let tags;
  // Reuse existing tags if answers are identical and tags already exist to avoid duplicate AI calls
  if (
    existingResponse &&
    Array.isArray(existingResponse.tags) &&
    existingResponse.tags.length > 0 &&
    areAnswersIdentical(existingResponse.answers, answers)
  ) {
    tags = existingResponse.tags;
  } else {
    tags = await generateProfileTags(features);
  }

  const now = new Date();

  await QuestionnaireResponse.findOneAndUpdate(
    { userId: req.user._id },
    {
      $set: {
        version: 1,
        answers,
        features,
        tags,
        aiProvider: "Groq",
        aiModel: env.groqModel || "llama-3.3-70b-versatile",
        completedAt: now,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await Profile.updateOne(
    { userId: req.user._id },
    { $set: { questionnaireStatus: "COMPLETED" } },
  );

  return res.json({
    success: true,
    message: "Questionnaire completed.",
    questionnaireStatus: "COMPLETED",
    tags,
    nextStep: "DASHBOARD",
  });
}
