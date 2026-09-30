import mongoose from "mongoose";

const profileSchema = new mongoose.Schema(
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
      default: null,
      index: true,
    },
    fullName: { type: String, trim: true, maxlength: 100 },
    dateOfBirth: { type: Date },
    gender: {
      type: String,
      enum: ["female", "male", "non-binary", "prefer-not-to-say"],
    },
    course: { type: String, trim: true, maxlength: 100 },
    academicYear: { type: String, enum: ["1", "2", "3", "4", "5"] },
    studentId: { type: String, trim: true, maxlength: 60 },
    onboardingStatus: {
      type: String,
      enum: [
        "COLLEGE_PENDING",
        "PROFILE_PENDING",
        "PROFILE_COMPLETED",
        "PROFILE_PHOTO_COMPLETED",
        "COLLEGE_ID_SUBMITTED",
        "LIVE_PHOTO_SUBMITTED",
        "COMPLETED",
      ],
      default: "COLLEGE_PENDING",
    },
    profilePhoto: {
      _id: false,
      publicId: { type: String, trim: true },
      url: { type: String, trim: true },
      secureUrl: { type: String, trim: true },
      format: { type: String, trim: true },
      width: { type: Number },
      height: { type: Number },
      uploadedAt: { type: Date },
    },
    verificationStatus: {
      type: String,
      enum: ["NOT_SUBMITTED", "PENDING", "VERIFIED", "REJECTED"],
      default: "NOT_SUBMITTED",
    },
    questionnaireStatus: {
      type: String,
      enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"],
      default: "NOT_STARTED",
    },
    activePlan: {
      type: String,
      enum: ["none", "vibe", "premium"],
      default: "none",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["UNPAID", "PENDING", "PAID"],
      default: "UNPAID",
      index: true,
    },
    activePaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    anonymousAlias: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    revealedWithUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  { timestamps: true, versionKey: false },
);

profileSchema.index({ anonymousAlias: 1 }, { unique: true, sparse: true });

export default mongoose.model("Profile", profileSchema);
