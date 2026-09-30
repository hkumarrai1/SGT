import mongoose from "mongoose";

const livePhotoSchema = new mongoose.Schema(
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
    sessionId: { type: String, trim: true },
    cloudinaryPublicId: { type: String, required: true, trim: true },
    cloudinaryAssetId: { type: String, trim: true },
    resourceType: { type: String, default: "image" },
    deliveryType: { type: String, default: "private" },
    verificationType: {
      type: String,
      enum: ["LIVE_PHOTO"],
      default: "LIVE_PHOTO",
    },
    status: {
      type: String,
      enum: ["PENDING", "VERIFIED", "REJECTED"],
      default: "PENDING",
    },
    capturedAt: { type: Date, default: Date.now },
    submittedVia: {
      type: String,
      enum: ["LAPTOP_CAMERA", "MOBILE_CAMERA"],
      required: true,
    },
    fileFormat: { type: String, enum: ["jpeg", "png", "webp"], required: true },
    fileBytes: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.model("LivePhoto", livePhotoSchema);
