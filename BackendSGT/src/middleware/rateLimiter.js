import rateLimit from "express-rate-limit";

const emailWindows = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_EMAIL_REQUESTS = 3;

export const otpIpLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many OTP requests. Please try again later.",
  },
});

export function otpEmailLimiter(req, res, next) {
  const email =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "unknown";
  const now = Date.now();
  const current = emailWindows.get(email);
  const window =
    current && now - current.startedAt < WINDOW_MS
      ? current
      : { startedAt: now, count: 0 };

  if (window.count >= MAX_EMAIL_REQUESTS) {
    return res
      .status(429)
      .json({
        success: false,
        message:
          "Too many OTP requests for this email. Please try again later.",
      });
  }

  window.count += 1;
  emailWindows.set(email, window);
  return next();
}
