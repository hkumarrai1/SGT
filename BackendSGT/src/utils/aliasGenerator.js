const ADJECTIVES = [
  "Velvet",
  "Cosmic",
  "Neon",
  "Golden",
  "Midnight",
  "Radiant",
  "Royal",
  "Electric",
  "Amber",
  "Festive",
  "Silver",
  "Sunset",
  "Mystic",
  "Ruby",
  "Starlight",
  "Crimson",
  "Emerald",
  "Solar",
  "Dazzling",
  "Aurora",
];

const NOUNS = [
  "Garba",
  "Raas",
  "Dholak",
  "Dandiya",
  "Chogada",
  "Rhythm",
  "Dancer",
  "Sanedo",
  "Vibe",
  "Echo",
  "Groove",
  "Spirit",
  "Spark",
  "Beat",
  "Harmony",
  "Melody",
  "Celebrant",
  "Strobe",
  "Twirl",
  "Navratri",
];

/**
 * Generates a unique, festive campus alias.
 * Example output: "VelvetGarba_42", "NeonRaas_89"
 */
export function generateAnonymousAlias() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${adj}${noun}_${num}`;
}
