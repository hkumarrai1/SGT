import { allowedTagSet, tagLibrary } from "../data/tagLibrary.js";
import { executeGroqChatCompletion, createServiceError, extractJsonFromText } from "./groqClient.js";
import { env } from "../config/env.js";

const systemPrompt = `You are the SGT Profile Tagging Engine.
SGT (Souls Gather Together) is a university-focused connection platform.

Your job is to analyze structured questionnaire features and select profile tags that accurately represent the user's SGT personality and event vibe.

IMPORTANT RULES:
1. You may ONLY select tags from the provided allowed tag library.
2. Never invent or modify a tag.
3. Return a maximum of 5 tags.
4. Tags should represent the user's overall questionnaire profile.
5. Do not make psychological diagnoses.
6. Do not calculate compatibility.
7. Do not return explanations.
8. Output a valid JSON object ONLY.

Allowed tags:
PERSONALITY: Introvert, Ambivert, Extrovert
SOCIAL STYLE: Private, Balanced, Social, One-on-One, Crowd Lover
ENERGY: Calm, Balanced, Energetic, High Energy
LIFESTYLE: Homebody, Explorer, Adventurous, Planner, Spontaneous
INTERESTS: Movie Lover, Foodie, Gamer, Music Lover, Activity Lover
DANDIYA: Traditional, Modern Vibe, Bollywood Lover, Social Dancer, Dance Partner
CONNECTION: Deep Conversationalist, Humor Driven, Common-Interest Seeker, Experience Seeker, Fun Seeker

JSON format:
{"tags": ["Tag1", "Tag2", "Tag3"]}`;

function parseTagResponse(content) {
  const parsed = extractJsonFromText(content);
  if (!parsed || !Array.isArray(parsed.tags)) {
    throw createServiceError(
      "AI tagging returned an invalid tag response structure.",
      502,
      "INVALID_TAG_RESPONSE"
    );
  }

  const tags = [...new Set(parsed.tags)].filter((tag) => allowedTagSet.has(tag));

  if (!tags.length) {
    throw createServiceError(
      "No valid tags from the approved library were returned.",
      502,
      "NO_VALID_TAGS"
    );
  }

  if (tags.length > 5) {
    return tags.slice(0, 5);
  }

  return tags;
}

export async function generateProfileTags(features) {
  if (!features || typeof features !== "object") {
    throw createServiceError("Valid questionnaire features are required for AI tagging.", 400);
  }

  const userMessage = `Here are the candidate's questionnaire features and the allowed tag library:

ALLOWED TAGS:
${JSON.stringify(tagLibrary, null, 2)}

USER QUESTIONNAIRE FEATURES:
${JSON.stringify(features, null, 2)}

INSTRUCTION:
Analyze the user's questionnaire features and select up to 5 best-fitting tags from the allowed tag library.
Respond strictly in JSON format:
{"tags": ["Tag1", "Tag2", "Tag3"]}`;

  const responseContent = await executeGroqChatCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    responseFormat: { type: "json_object" },
    temperature: 0.1,
    maxTokens: 500,
    model: env.groqModel || "llama-3.3-70b-versatile",
  });

  return parseTagResponse(responseContent);
}
