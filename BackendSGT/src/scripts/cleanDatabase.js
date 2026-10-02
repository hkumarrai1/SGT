import { connectDatabase } from "../config/db.js";
import { validateEnv } from "../config/env.js";
import User from "../models/User.js";
import Profile from "../models/Profile.js";
import Payment from "../models/Payment.js";
import Match from "../models/Match.js";
import MatchSession from "../models/MatchSession.js";
import Message from "../models/Message.js";
import Otp from "../models/Otp.js";
import Verification from "../models/Verification.js";
import VerificationApplication from "../models/VerificationApplication.js";
import LivePhoto from "../models/LivePhoto.js";
import LiveVerificationSession from "../models/LiveVerificationSession.js";
import QuestionnaireResponse from "../models/QuestionnaireResponse.js";
import PromoCode from "../models/PromoCode.js";
import Institution from "../models/Institution.js";
import { seedInstitutions } from "./seedInstitution.js";

async function cleanLegacyData() {
  console.log("==========================================");
  console.log("🧹 SGT DATABASE CLEANUP: WIPING LEGACY DATA");
  console.log("==========================================");

  validateEnv();
  await connectDatabase();

  const collectionsToClean = [
    { name: "Users", model: User },
    { name: "Profiles", model: Profile },
    { name: "Payments", model: Payment },
    { name: "Matches", model: Match },
    { name: "MatchSessions", model: MatchSession },
    { name: "Messages (Chats)", model: Message },
    { name: "OTPs", model: Otp },
    { name: "College ID Verifications", model: Verification },
    { name: "Verification Applications", model: VerificationApplication },
    { name: "Live Photos", model: LivePhoto },
    { name: "Live Verification Sessions", model: LiveVerificationSession },
    { name: "Questionnaire Responses", model: QuestionnaireResponse },
    { name: "Promo / Offer Codes", model: PromoCode },
  ];

  const results = {};

  for (const { name, model } of collectionsToClean) {
    const countBefore = await model.countDocuments();
    const deleteRes = await model.deleteMany({});
    results[name] = {
      before: countBefore,
      deleted: deleteRes.deletedCount,
    };
    console.log(`✓ Cleared ${name}: ${deleteRes.deletedCount} records deleted.`);
  }

  // Ensure Institutions list is intact for live registration
  const instCount = await Institution.countDocuments();
  if (instCount < 167) {
    console.log("Re-seeding institutions list to ensure all 167 colleges are present...");
    await seedInstitutions();
  } else {
    console.log(`✓ Preserved ${instCount} active universities and colleges in Institutions database.`);
  }

  console.log("==========================================");
  console.log("🎉 DATABASE IS NOW 100% CLEAN & READY FOR LAUNCH!");
  console.log("==========================================");
}

cleanLegacyData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Database cleanup failed:", err);
    process.exit(1);
  });
