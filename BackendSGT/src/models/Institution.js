import mongoose from "mongoose";

const institutionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    shortName: { type: String, trim: true },
    city: { type: String, trim: true },
    emailDomain: { type: String, lowercase: true, trim: true, default: "" },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

institutionSchema.index({ active: 1, name: 1 });

export default mongoose.model("Institution", institutionSchema);
