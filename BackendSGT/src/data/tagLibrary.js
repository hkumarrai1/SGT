export const tagLibrary = {
  personality: ["Introvert", "Ambivert", "Extrovert"],
  socialStyle: ["Private", "Balanced", "Social", "One-on-One", "Crowd Lover"],
  energy: ["Calm", "Balanced", "Energetic", "High Energy"],
  lifestyle: ["Homebody", "Explorer", "Adventurous", "Planner", "Spontaneous"],
  interests: [
    "Movie Lover",
    "Foodie",
    "Gamer",
    "Music Lover",
    "Activity Lover",
  ],
  dandiya: [
    "Traditional",
    "Modern Vibe",
    "Bollywood Lover",
    "Social Dancer",
    "Dance Partner",
  ],
  connection: [
    "Deep Conversationalist",
    "Humor Driven",
    "Common-Interest Seeker",
    "Experience Seeker",
    "Fun Seeker",
  ],
};

export const allowedTags = Object.freeze(Object.values(tagLibrary).flat());
export const allowedTagSet = new Set(allowedTags);
