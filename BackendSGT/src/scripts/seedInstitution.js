import { connectDatabase } from "../config/db.js";
import { validateEnv } from "../config/env.js";
import Institution from "../models/Institution.js";

const INSTITUTIONS_LIST = [
  { name: "Delhi Technical Campus", shortName: "DTC", city: "Greater Noida" },
  { name: "Delhi University (DU)", shortName: "DU", city: "Delhi" },
  { name: "Guru Gobind Singh Indraprastha University", shortName: "GGSIPU", city: "Delhi" },
  { name: "Delhi Technological University", shortName: "DTU", city: "Delhi" },
  { name: "Netaji Subhas University of Technology", shortName: "NSUT", city: "Delhi" },
  { name: "Indira Gandhi Delhi Technical University for Women", shortName: "IGDTUW", city: "Delhi" },
  { name: "IIT Delhi", shortName: "IITD", city: "New Delhi" },
  { name: "Amity University", shortName: "Amity", city: "Noida" },
  { name: "Galgotias University", shortName: "Galgotias", city: "Greater Noida" },
  { name: "Bennett University", shortName: "Bennett", city: "Greater Noida" },
  { name: "Sharda University", shortName: "Sharda", city: "Greater Noida" },
  { name: "Jamia Millia Islamia", shortName: "JMI", city: "New Delhi" },
  { name: "Jawaharlal Nehru University", shortName: "JNU", city: "New Delhi" },
  { name: "Manipal University", shortName: "Manipal", city: "Jaipur" },
  { name: "SRM Institute of Science and Technology", shortName: "SRM", city: "NCR" },
  { name: "Symbiosis International University", shortName: "SIU", city: "Noida / Pune" },
  { name: "All Other Universities / Organizations", shortName: "Other", city: "India" },
];

try {
  validateEnv();
  await connectDatabase();
  for (const inst of INSTITUTIONS_LIST) {
    await Institution.findOneAndUpdate(
      { name: inst.name },
      { ...inst, active: true },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  console.log(`Institution seed complete: ${INSTITUTIONS_LIST.length} institutions seeded/updated.`);
  process.exit(0);
} catch (error) {
  console.error("Institution seed failed:", error?.message || error);
  process.exitCode = 1;
}
