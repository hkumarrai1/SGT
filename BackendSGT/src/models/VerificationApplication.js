import mongoose from "mongoose";

const verificationApplicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      required: true,
    },
    verificationStatus: {
      type: String,
      enum: ["PENDING", "VERIFIED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
    reviewerId: { type: String },
    rejectionReason: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.model(
  "VerificationApplication",
  verificationApplicationSchema,
);
