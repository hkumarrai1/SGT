import app from "./app.js";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { seedInstitutions } from "./scripts/seedInstitution.js";

async function startServer() {
  await connectDatabase();
  
  // Ensure all updated institutions are seeded/synced on launch
  seedInstitutions().catch((err) => {
    console.error("Auto-seed institutions notice:", err?.message || err);
  });

  app.listen(env.port, () => {
    console.log(`SGT backend running on http://localhost:${env.port}`);
  });
}

startServer().catch((error) => {
  console.error("Unable to start SGT backend", error);
  process.exitCode = 1;
});
