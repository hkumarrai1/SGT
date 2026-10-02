import mongoose from "mongoose";

const matchSchema = new mongoose.Schema(
  {
    user1Id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    user2Id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["SEARCHING", "AI_EVALUATING", "ACTIVE", "DECLINED", "EXPIRED", "CANCELLED_BY_ADMIN"],
      default: "ACTIVE",
      index: true,
    },
    compatibilityScore: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    deterministicScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    synthesisScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    synthesis: {
      matchHeadline: { type: String, trim: true },
      connectionNarrative: { type: String, trim: true },
      sharedVibe: { type: String, trim: true },
      icebreakerPrompt: { type: String, trim: true },
    },
    matchedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    user1Revealed: {
      type: Boolean,
      default: false,
    },
    user2Revealed: {
      type: Boolean,
      default: false,
    },
    isRevealed: {
      type: Boolean,
      default: false,
      index: true,
    },
    revealedAt: {
      type: Date,
    },
    lastMessageAt: {
      type: Date,
    },
    declinedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    declinedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
  },
  { timestamps: true, versionKey: false },
);

// Compound indexes for rapid lookup of active matches for a user
matchSchema.index({ user1Id: 1, status: 1 });
matchSchema.index({ user2Id: 1, status: 1 });
matchSchema.index({ user1Id: 1, user2Id: 1 });

export default mongoose.model("Match", matchSchema);
