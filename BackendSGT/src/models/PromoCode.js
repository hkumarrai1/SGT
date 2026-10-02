import mongoose from "mongoose";

const promoCodeSchema = new mongoose.Schema(
  {
    influencerName: {
      type: String,
      required: [true, "Influencer name is required."],
      trim: true,
      maxlength: 120,
    },
    influencerEmail: {
      type: String,
      required: [true, "Influencer email is required."],
      trim: true,
      lowercase: true,
    },
    code: {
      type: String,
      required: [true, "Promo code is required."],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
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
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  { timestamps: true, versionKey: false },
);

promoCodeSchema.index({ code: 1 }, { unique: true });
promoCodeSchema.index({ influencerEmail: 1 });
promoCodeSchema.index({ isActive: 1 });

export default mongoose.model("PromoCode", promoCodeSchema);
