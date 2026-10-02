import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    isEmailVerified: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    isBlocked: { type: Boolean, default: false, index: true },
    blockReason: { type: String, trim: true, default: "" },
    blockedAt: { type: Date, default: null },
    termsAccepted: { type: Boolean, default: false },
    termsAcceptedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.model("User", userSchema);
