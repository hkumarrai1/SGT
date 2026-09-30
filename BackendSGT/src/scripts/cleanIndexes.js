import mongoose from "mongoose";
import { connectDatabase } from "../config/db.js";
import { validateEnv } from "../config/env.js";

async function main() {
  validateEnv();
  await connectDatabase();

  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log("Found collections:", collections.map((c) => c.name));

  for (const col of collections) {
    const colName = col.name;
    const collection = mongoose.connection.collection(colName);
    const indexes = await collection.indexes();
    console.log(`\n--- Collection: ${colName} ---`);
    console.log("Indexes:", indexes);

    for (const idx of indexes) {
      if (idx.name === "firebaseUID_1") {
        console.log(`Dropping index ${idx.name} on ${colName}...`);
        await collection.dropIndex(idx.name);
        console.log(`Successfully dropped ${idx.name}`);
      }
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Index cleanup error:", err);
  process.exit(1);
});
