import mongoose from "mongoose";

const liveVerificationSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    step: { type: String, enum: ["LIVE_PHOTO"], default: "LIVE_PHOTO" },
    status: {
      type: String,
      enum: [
        "ACTIVE",
        "PHONE_CONNECTED",
        "PHOTO_SUBMITTED",
        "COMPLETED",
        "EXPIRED",
        "CANCELLED",
      ],
      default: "ACTIVE",
    },
    expiresAt: { type: Date, required: true, index: true },
    usedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

liveVerificationSessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);

export default mongoose.model(
  "LiveVerificationSession",
  liveVerificationSessionSchema,
);
