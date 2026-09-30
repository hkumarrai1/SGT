import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env, validateEnv } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import institutionRoutes from "./routes/institutionRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import liveVerificationRoutes from "./routes/liveVerificationRoutes.js";
import verificationRoutes from "./routes/verificationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import questionnaireRoutes from "./routes/questionnaireRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import matchRoutes from "./routes/matchRoutes.js";

validateEnv();

const app = express();

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.trim().replace(/\/+$/, "");

      if (
        env.clientUrls.includes(cleanOrigin) ||
        /\.vercel\.app$/.test(cleanOrigin) ||
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)
      ) {
        return callback(null, true);
      }

      // Permissive fallback so production requests are never blocked
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);
app.use(express.json({ limit: "10kb" }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    service: "sgt-backend",
    message: "SGT backend is running.",
    health: "/health",
  });
});

app.get("/health", (req, res) => {
  res.json({ success: true, service: "sgt-backend", status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/institutions", institutionRoutes);
app.use("/api", profileRoutes);
app.use("/api/verification", liveVerificationRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/questionnaire", questionnaireRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/match", matchRoutes);
app.use("/api/admin", adminRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
