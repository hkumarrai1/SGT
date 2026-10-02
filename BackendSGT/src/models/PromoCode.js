import mongoose from "mongoose";

const promoCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Code is required."],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    codeType: {
      type: String,
      enum: ["OFFER_CODE", "INFLUENCER"],
      default: "OFFER_CODE",
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },
    discountType: {
      type: String,
      enum: ["PERCENTAGE", "FLAT"],
      default: "PERCENTAGE",
    },
    discountPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    discount499: {
      type: Number,
      default: 150,
      min: 0,
    },
    discount999: {
      type: Number,
      default: 250,
      min: 0,
    },
    maxUses: {
      type: Number,
      default: 0, // 0 means Unlimited
      min: 0,
    },
    applicablePlans: {
      type: String,
      enum: ["all", "vibe", "premium"],
      default: "all",
    },
    influencerName: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    influencerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    totalUses: {
      type: Number,
      default: 0,
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },
    totalDiscountGiven: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    createdBy: {
      type: String,
      trim: true,
      default: "admin",
    },
  },
  { timestamps: true, versionKey: false },
);

promoCodeSchema.index({ code: 1 }, { unique: true });
promoCodeSchema.index({ codeType: 1, isActive: 1 });
promoCodeSchema.index({ influencerEmail: 1 });

export default mongoose.model("PromoCode", promoCodeSchema);
