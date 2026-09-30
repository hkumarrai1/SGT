import mongoose from "mongoose";

const questionnaireAnswerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    trait: { type: String, required: true, trim: true },
    optionId: { type: String, required: true, enum: ["A", "B", "C", "D"] },
    optionText: { type: String, required: true, trim: true },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { _id: false },
);

const questionnaireResponseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    version: { type: Number, default: 1 },
    answers: {
      type: [questionnaireAnswerSchema],
      required: true,
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length === 10;
        },
        message: "All questionnaire answers are required.",
      },
    },
    features: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length <= 5;
        },
        message: "A maximum of 5 tags can be saved.",
      },
    },
    aiProvider: { type: String, default: "Gemini" },
    aiModel: { type: String, trim: true },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.model(
  "QuestionnaireResponse",
  questionnaireResponseSchema,
);
