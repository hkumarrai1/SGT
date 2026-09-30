import mongoose from "mongoose";

const verificationSchema = new mongoose.Schema(
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
      index: true,
    },
    cloudinaryPublicId: { type: String, required: true, trim: true },
    cloudinaryAssetId: { type: String, trim: true },
    resourceType: { type: String, default: "image" },
    deliveryType: { type: String, default: "private" },
    documentType: { type: String, enum: ["college-id"], default: "college-id" },
    fileFormat: { type: String, enum: ["jpeg", "png"], required: true },
    fileBytes: { type: Number, required: true, max: 10 * 1024 * 1024 },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
    verificationStatus: {
      type: String,
      enum: ["NOT_UPLOADED", "PENDING", "VERIFIED", "REJECTED"],
      default: "NOT_UPLOADED",
    },
    studentId: { type: String, trim: true, maxlength: 60 },
    rejectionReason: { type: String, trim: true, maxlength: 500 },
    reviewedAt: { type: Date },
    reviewerId: { type: String, trim: true },
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.model("Verification", verificationSchema);
