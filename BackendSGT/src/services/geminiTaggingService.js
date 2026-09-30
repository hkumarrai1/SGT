import { GoogleGenAI } from "@google/genai";
import { allowedTagSet, tagLibrary } from "../data/tagLibrary.js";
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
7. Do not estimate whether the user will like another person.
8. Do not return explanations unless explicitly requested.
9. Return valid JSON only.
10. If the data is ambiguous, select the most reasonable tags from the allowed library.

Allowed tags:

PERSONALITY:
- Introvert
- Ambivert
- Extrovert

SOCIAL STYLE:
- Private
- Balanced
- Social
- One-on-One
- Crowd Lover

ENERGY:
- Calm
- Balanced
- Energetic
- High Energy

LIFESTYLE:
- Homebody
- Explorer
- Adventurous
- Planner
- Spontaneous

INTERESTS:
- Movie Lover
- Foodie
- Gamer
- Music Lover
- Activity Lover

DANDIYA:
- Traditional
- Modern Vibe
- Bollywood Lover
- Social Dancer
- Dance Partner

CONNECTION:
- Deep Conversationalist
- Humor Driven
- Common-Interest Seeker
- Experience Seeker
- Fun Seeker

Return exactly this JSON structure:

{
  "tags": ["Tag 1", "Tag 2", "Tag 3"]
}`;

function serviceError(message, statusCode = 502) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseTagResponse(content) {
  try {
    const json = content
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    const parsed = JSON.parse(json);
    if (!parsed || !Array.isArray(parsed.tags)) {
      throw new Error("Missing tags array.");
    }

    const tags = [...new Set(parsed.tags)].filter((tag) =>
      allowedTagSet.has(tag),
    );

    if (!tags.length || tags.length > 5 || tags.length !== parsed.tags.length) {
      throw new Error("Tags are outside the approved library.");
    }

    return tags;
  } catch {
    throw serviceError("AI tagging returned an invalid tag response.");
  }
}

export async function generateProfileTags(features) {
  if (!env.geminiApiKey || env.geminiApiKey === "YOUR_GEMINI_API_KEY") {
    throw serviceError("Gemini API key is not configured.", 503);
  }

  const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });

  try {
    const response = await ai.models.generateContent({
      model: env.geminiModel || "gemini-2.5-flash",
      contents: JSON.stringify({
        allowedTags: tagLibrary,
        features,
        instruction:
          "Select up to 5 allowed tags for this SGT profile. Do not calculate compatibility.",
      }),
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const content = response?.text;
    if (!content) {
      throw serviceError("AI tagging returned an empty response.");
    }

    return parseTagResponse(content);
  } catch (error) {
    if (error.statusCode) throw error;
    throw serviceError(error.message || "AI tagging request failed.");
  }
}
