import { executeGroqChatCompletion, extractJsonFromText } from "./groqClient.js";
import { env } from "../config/env.js";

const systemPrompt = `You are the SGT Compatibility Synthesis Engine.
SGT (Souls Gather Together) is a university-focused connection platform designed for university Dandiya celebrations.

Your role is to evaluate a shortlist of candidates (filtered by campus and personality traits) against the primary user, with a strong focus on:
- Question 9: Connection Style (Deep conversations, Humor, Shared interests, or Having fun experiences)
- Question 10: First Interaction (Sit & conversation, Walk around, Dance together, or Natural fun)
- Overall profile vibe tags and Dandiya energy

INSTRUCTIONS:
1. Select the BEST MATCH candidate from the provided shortlist based on interpersonal synergy and Dandiya connection compatibility.
2. Calculate a synthesis compatibility score between 75 and 98 based on how well their Q9 & Q10 intents complement or align with each other.
3. Generate a warm, festive, university-friendly headline, connection narrative (explaining why their connection styles click), shared vibe, and a creative Dandiya icebreaker prompt.
4. Do NOT make psychological diagnoses or clinical claims.
5. Return strict valid JSON only adhering exactly to the requested schema.

Return JSON in this format:
{
  "selectedCandidateId": "the_chosen_candidate_id",
  "synthesisScore": 92,
  "matchHeadline": "High-Energy Dandiya Partners with Natural Chemistry",
  "connectionNarrative": "You both value humor and natural moments, preferring to dive straight into dancing together before taking a walk to talk.",
  "sharedVibe": "Bollywood Garba & High Energy Rhythm",
  "icebreakerPrompt": "Ask them if they prefer traditional Gujarati beats or high-tempo Bollywood Garba tracks!"
}`;

function buildDeterministicFallback(targetUser, candidate) {
  const userQ9 = targetUser.answers?.C01 || targetUser.categoricalTraits?.connection_style || "Shared connection";
  const candidateQ9 = candidate.answers?.C01 || candidate.categoricalTraits?.connection_style || "Shared connection";
  const userQ10 = targetUser.answers?.C02 || targetUser.categoricalTraits?.first_interaction || "Natural interaction";
  const candidateQ10 = candidate.answers?.C02 || candidate.categoricalTraits?.first_interaction || "Natural interaction";

  return {
    selectedCandidateId: candidate.userId.toString(),
    synthesisScore: Math.min(95, Math.max(80, Math.round(candidate.deterministicScore || 85))),
    matchHeadline: "Harmonious Dandiya & Campus Connection",
    connectionNarrative: `You both share complementary event vibes, prioritizing ${userQ9} and enjoying a ${userQ10} approach to your first Dandiya meetup.`,
    sharedVibe: "Festive Garba Rhythm & Shared Energy",
    icebreakerPrompt: "Ask them what time they are planning to hit the Dandiya circle tonight!",
  };
}

export async function synthesizeCompatibility(targetUser, candidates) {
  if (!candidates || candidates.length === 0) {
    return null;
  }

  const primaryFallback = buildDeterministicFallback(targetUser, candidates[0]);

  if (!env.groqApiKey || env.groqApiKey.trim() === "" || env.groqApiKey === "YOUR_GROQ_API_KEY") {
    return primaryFallback;
  }

  const candidatePayload = candidates.map((c) => ({
    candidateId: c.userId.toString(),
    tags: c.tags || [],
    q9_connectionStyle: c.answers?.C01 || c.categoricalTraits?.connection_style || "Unspecified",
    q10_firstInteraction: c.answers?.C02 || c.categoricalTraits?.first_interaction || "Unspecified",
    danceEnergy: c.numericTraits?.dance_energy || 0.5,
    musicStyle: c.categoricalTraits?.music_style || "traditional",
    deterministicHarmonyScore: c.deterministicScore,
  }));

  const userPayload = {
    userId: targetUser.userId.toString(),
    tags: targetUser.tags || [],
    q9_connectionStyle: targetUser.answers?.C01 || targetUser.categoricalTraits?.connection_style || "Unspecified",
    q10_firstInteraction: targetUser.answers?.C02 || targetUser.categoricalTraits?.first_interaction || "Unspecified",
    danceEnergy: targetUser.numericTraits?.dance_energy || 0.5,
    musicStyle: targetUser.categoricalTraits?.music_style || "traditional",
  };

  try {
    const userMessage = `Evaluate candidate compatibility for Dandiya matchmaking and respond strictly in JSON format.

PRIMARY USER:
${JSON.stringify(userPayload, null, 2)}

SHORTLIST CANDIDATES:
${JSON.stringify(candidatePayload, null, 2)}

INSTRUCTION:
Select the single best candidate and synthesize their connection synergy.
Respond with a valid JSON object matching the requested schema.`;

    const responseContent = await executeGroqChatCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      responseFormat: { type: "json_object" },
      temperature: 0.2,
      maxTokens: 800,
      model: env.groqModel || "llama-3.3-70b-versatile",
    });

    const parsed = extractJsonFromText(responseContent);
    if (!parsed) {
      return primaryFallback;
    }

    // Validate that the returned candidate ID exists in candidate pool
    const validCandidate = candidates.find(
      (c) => c.userId.toString() === String(parsed.selectedCandidateId || "")
    );

    if (!validCandidate) {
      return primaryFallback;
    }

    const synthesisScore = Math.min(
      99,
      Math.max(70, Number(parsed.synthesisScore) || primaryFallback.synthesisScore)
    );

    return {
      selectedCandidateId: validCandidate.userId.toString(),
      synthesisScore,
      matchHeadline: String(parsed.matchHeadline || primaryFallback.matchHeadline).slice(0, 100),
      connectionNarrative: String(
        parsed.connectionNarrative || primaryFallback.connectionNarrative
      ).slice(0, 350),
      sharedVibe: String(parsed.sharedVibe || primaryFallback.sharedVibe).slice(0, 80),
      icebreakerPrompt: String(
        parsed.icebreakerPrompt || primaryFallback.icebreakerPrompt
      ).slice(0, 150),
    };
  } catch (error) {
    console.warn("Groq compatibility synthesis fallback engaged:", error.message);
    return primaryFallback;
  }
}
