import "dotenv/config";

const required = [
  "MONGODB_URI",
  "JWT_SECRET",
  "OTP_HASH_SECRET",
  "BREVO_API_KEY",
  "BREVO_FROM_EMAIL",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "ADMIN_ID",
  "ADMIN_PASSWORD",
];

export function validateEnv() {
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  clientUrls: (
    process.env.CLIENT_URLS ||
    process.env.CLIENT_URL ||
    "http://localhost:5173"
  )
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  otpHashSecret: process.env.OTP_HASH_SECRET,
  brevoApiKey: process.env.BREVO_API_KEY,
  brevoFromEmail: process.env.BREVO_FROM_EMAIL,
  brevoFromName: process.env.BREVO_FROM_NAME || "SGT - Souls Gather Together",
  brevoTemplateId: process.env.BREVO_TEMPLATE_ID || "",
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  mobileVerifyBaseUrl:
    process.env.MOBILE_VERIFY_BASE_URL ||
    process.env.CLIENT_URL ||
    "http://localhost:5173",
  adminId: process.env.ADMIN_ID,
  adminPassword: process.env.ADMIN_PASSWORD,
};
