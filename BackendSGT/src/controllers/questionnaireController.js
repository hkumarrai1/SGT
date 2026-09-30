import { getSanitizedQuestionnaire } from "../data/questionnaire.js";
import { env } from "../config/env.js";
import Profile from "../models/Profile.js";
import QuestionnaireResponse from "../models/QuestionnaireResponse.js";
import { getAuthoritativeStatus } from "../services/onboardingStatusService.js";
import {
  extractQuestionnaireFeatures,
  validateQuestionnaireAnswers,
} from "../services/questionnaireFeatureService.js";
import { generateProfileTags } from "../services/geminiTaggingService.js";

function forbidden(message) {
  const error = new Error(message);
  error.statusCode = 403;
  return error;
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
  const tags = await generateProfileTags(features);
  const now = new Date();

  await QuestionnaireResponse.findOneAndUpdate(
    { userId: req.user._id },
    {
      $set: {
        version: 1,
        answers,
        features,
        tags,
        aiProvider: "Gemini",
        aiModel: env.geminiModel,
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
