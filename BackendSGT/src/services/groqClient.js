import Groq from "groq-sdk";
import { env } from "../config/env.js";

const MAX_PAYLOAD_CHAR_LIMIT = 50000;
const DEFAULT_TIMEOUT_MS = 25000;
const MAX_RETRIES = 3;

export function createServiceError(message, statusCode = 502, code = "AI_SERVICE_ERROR") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

export function extractJsonFromText(text) {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();

  // 1. Direct JSON parse
  try {
    return JSON.parse(trimmed);
  } catch {}

  // 2. Markdown code block extraction (```json ... ``` or ``` ...)
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch && fenceMatch[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {}
  }

  // 3. Substring between outermost { ... }
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const jsonSubstring = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonSubstring);
    } catch {}
  }

  return null;
}

function getGroqClient() {
  if (!env.groqApiKey || env.groqApiKey.trim() === "" || env.groqApiKey === "YOUR_GROQ_API_KEY") {
    throw createServiceError(
      "Groq API key is not configured on the server. Please configure GROQ_API_KEY.",
      503,
      "GROQ_KEY_MISSING"
    );
  }

  return new Groq({
    apiKey: env.groqApiKey,
    timeout: DEFAULT_TIMEOUT_MS,
  });
}

function isTransientError(error) {
  const status = error.status || error.statusCode || error.response?.status;

  // Rate limits (429) and temporary server issues (500, 502, 503, 504)
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
    return true;
  }

  // Common transient network / socket errors
  const code = error.code || "";
  const message = (error.message || "").toLowerCase();
  if (
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "ECONNREFUSED" ||
    code === "UND_ERR_CONNECT_TIMEOUT" ||
    code === "UND_ERR_SOCKET" ||
    message.includes("network error") ||
    message.includes("timeout") ||
    message.includes("fetch failed")
  ) {
    return true;
  }

  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isJsonValidationFailedError(err) {
  if (!err) return false;
  const message = (err.message || "").toLowerCase();
  const code = (err.code || err.error?.code || "").toLowerCase();
  return code === "json_validate_failed" || message.includes("json_validate_failed") || message.includes("failed to validate json");
}

/**
 * Robust Groq Chat Completion runner with fallback for JSON mode, timeouts, input validation, and exponential backoff
 */
export async function executeGroqChatCompletion({
  messages,
  responseFormat = { type: "json_object" },
  temperature = 0.1,
  maxTokens = 1000,
  model = env.groqModel || "llama-3.3-70b-versatile",
}) {
  const client = getGroqClient();

  // Validate payload size
  const totalLength = JSON.stringify(messages).length;
  if (totalLength > MAX_PAYLOAD_CHAR_LIMIT) {
    throw createServiceError(
      "Input payload exceeds the safe character limit for AI analysis.",
      400,
      "PAYLOAD_TOO_LARGE"
    );
  }

  let lastError = null;
  let useConstrainedFormat = Boolean(responseFormat);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const params = {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      };

      if (useConstrainedFormat) {
        params.response_format = responseFormat;
      }

      const completion = await client.chat.completions.create(params);
      const content = completion.choices?.[0]?.message?.content;

      if (!content || typeof content !== "string" || !content.trim()) {
        throw createServiceError("Groq returned an empty response.", 502, "EMPTY_RESPONSE");
      }

      return content.trim();
    } catch (err) {
      lastError = err;

      const status = err.status || err.statusCode || err.response?.status;

      // If Groq's constrained grammar enforcer fails, switch to standard completion and parse server-side
      if (useConstrainedFormat && isJsonValidationFailedError(err)) {
        console.warn("[GroqClient] json_validate_failed encountered. Retrying without constrained response_format...");
        useConstrainedFormat = false;
        continue;
      }

      // Do NOT retry permanent auth errors (401 Auth, 403 Forbidden)
      if (status === 401 || status === 403) {
        throw createServiceError(
          "Groq API authentication failed. Please verify GROQ_API_KEY in server environment.",
          503,
          "GROQ_AUTH_FAILED"
        );
      }

      if (attempt < MAX_RETRIES && isTransientError(err)) {
        let delayMs = 1000 * Math.pow(2, attempt - 1) + Math.random() * 500;
        const retryAfterHeader = err.headers?.get?.("retry-after") || err.response?.headers?.["retry-after"];
        if (retryAfterHeader) {
          const parsedSeconds = Number(retryAfterHeader);
          if (!Number.isNaN(parsedSeconds) && parsedSeconds > 0) {
            delayMs = Math.min(10000, parsedSeconds * 1000);
          }
        }

        console.warn(
          `[GroqClient] Transient error on attempt ${attempt}/${MAX_RETRIES} (status ${status || err.code}). Retrying in ${Math.round(delayMs)}ms...`
        );
        await sleep(delayMs);
        continue;
      }

      break;
    }
  }

  // Parse error message cleanly for users
  const finalStatus = lastError?.status || lastError?.statusCode || 502;
  if (finalStatus === 429) {
    throw createServiceError(
      "AI analysis service is temporarily busy due to rate limits. Please try again in a moment.",
      429,
      "RATE_LIMIT_EXCEEDED"
    );
  }

  // Clean up raw JSON error messages if any
  let userFriendlyMsg = lastError?.message || "Groq AI request failed.";
  try {
    const rawMatch = userFriendlyMsg.match(/\{"error":\{.*\}\}/);
    if (rawMatch) {
      const parsedRaw = JSON.parse(rawMatch[0]);
      if (parsedRaw.error?.message) {
        userFriendlyMsg = parsedRaw.error.message;
      }
    }
  } catch {}

  throw createServiceError(
    `AI analysis failed: ${userFriendlyMsg}`,
    finalStatus >= 400 && finalStatus < 600 ? finalStatus : 502,
    "GROQ_REQUEST_FAILED"
  );
}
