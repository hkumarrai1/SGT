import { connectDatabase } from "../config/db.js";
import { validateEnv } from "../config/env.js";
import Institution from "../models/Institution.js";
import { UNIVERSITIES_LIST } from "../data/institutionsList.js";

export async function seedInstitutions() {
  console.log(`Starting institutions seed with ${UNIVERSITIES_LIST.length} entries...`);
  
  const bulkOps = UNIVERSITIES_LIST.map((inst) => ({
    updateOne: {
      filter: { name: inst.name },
      update: {
        $set: {
          name: inst.name,
          shortName: inst.shortName,
          city: inst.city,
          active: true,
        },
      },
      upsert: true,
    },
  }));

  if (bulkOps.length > 0) {
    const result = await Institution.bulkWrite(bulkOps);
    console.log(`Seed complete: ${result.upsertedCount} inserted, ${result.modifiedCount} updated.`);
  }
}

// Run directly if script is executed
if (process.argv[1]?.endsWith("seedInstitution.js")) {
  try {
    validateEnv();
    await connectDatabase();
    await seedInstitutions();
    console.log("Seeding finished successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Institution seed failed:", error?.message || error);
    process.exit(1);
  }
}
