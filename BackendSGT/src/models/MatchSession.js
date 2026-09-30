import mongoose from "mongoose";

const matchSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "IDLE",
        "SEARCHING",
        "AI_EVALUATING",
        "WAITING_RETRY",
        "MATCHED",
        "TIMEOUT",
      ],
      default: "IDLE",
      index: true,
    },
    attempt: {
      type: Number,
      default: 1,
    },
    lastAttemptAt: {
      type: Date,
      default: Date.now,
    },
    nextRetryAt: {
      type: Date,
      default: null,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
    },
  },
  { timestamps: true, versionKey: false },
);

matchSessionSchema.index({ userId: 1, status: 1 });

export default mongoose.model("MatchSession", matchSessionSchema);
