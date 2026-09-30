export const categoryQuotas = {
  personality: 3,
  interests: 2,
  dandiya: 3,
  connection: 2,
};

const scaleOptions = [
  { id: "A", value: 0.15 },
  { id: "B", value: 0.4 },
  { id: "C", value: 0.7 },
  { id: "D", value: 1 },
];

function withScale(texts) {
  return texts.map((text, index) => ({ ...scaleOptions[index], text }));
}

export const questionnaire = [
  {
    id: "P01",
    category: "personality",
    trait: "social_energy",
    question:
      "At a college event where you barely know anyone, what are you most likely to do?",
    options: withScale([
      "Find a quiet corner and enjoy myself",
      "Talk to one or two people first",
      "Start conversations with different people",
      "Somehow end up knowing half the room",
    ]),
  },
  {
    id: "P02",
    category: "personality",
    trait: "social_preference",
    question: "Your ideal evening with someone you connect with is:",
    options: withScale([
      "A quiet conversation somewhere peaceful",
      "Food, talking, and a little music",
      "Exploring somewhere and trying something new",
      "A lively event with lots of people",
    ]),
  },
  {
    id: "P03",
    category: "personality",
    trait: "adaptability",
    question: "When plans suddenly change, you usually:",
    options: withScale([
      "Prefer sticking to the original plan",
      "Need a little time to adjust",
      "Go with the flow",
      "Love spontaneous plans",
    ]),
  },
  {
    id: "I01",
    category: "interests",
    trait: "adventure",
    question: "If you had a completely free Saturday, what sounds best?",
    options: withScale([
      "Gaming, movies, or staying at home",
      "Cafe and chatting with friends",
      "Exploring a new place",
      "Going to an event or activity",
    ]),
  },
  {
    id: "I02",
    category: "interests",
    trait: "shared_activity",
    question: "Which activity would you most likely enjoy with your match?",
    options: [
      { id: "A", text: "Watching a movie or series", value: "movie" },
      { id: "B", text: "Trying different food places", value: "food" },
      { id: "C", text: "Exploring the city", value: "explore" },
      {
        id: "D",
        text: "Playing games or doing an activity together",
        value: "activity",
      },
    ],
  },
  {
    id: "D01",
    category: "dandiya",
    trait: "dance_energy",
    question: "What's your ideal Dandiya night?",
    options: withScale([
      "Dance for a little and mostly enjoy the atmosphere",
      "Dance comfortably with my partner",
      "Dance a lot and have fun with the crowd",
      "Full energy - dance until the music stops",
    ]),
  },
  {
    id: "D02",
    category: "dandiya",
    trait: "music_style",
    question: "Your preferred music at a Dandiya event would be:",
    options: [
      { id: "A", text: "Traditional Gujarati/Garba", value: "traditional" },
      { id: "B", text: "Bollywood + Garba mix", value: "bollywood" },
      { id: "C", text: "Modern/remixed Garba", value: "modern" },
      { id: "D", text: "Anything with a good beat", value: "beat" },
    ],
  },
  {
    id: "D03",
    category: "dandiya",
    trait: "group_social_energy",
    question: "If your match asks you to join a group of people dancing, you:",
    options: withScale([
      "Would rather stay with my match",
      "Might join if I know someone",
      "Definitely join",
      "Bring my match into the group",
    ]),
  },
  {
    id: "C01",
    category: "connection",
    trait: "connection_style",
    question: "When getting to know someone, what matters most to you?",
    options: [
      { id: "A", text: "Deep conversations", value: "deep" },
      { id: "B", text: "Similar sense of humor", value: "humor" },
      { id: "C", text: "Shared interests", value: "interests" },
      {
        id: "D",
        text: "Having fun experiences together",
        value: "experience",
      },
    ],
  },
  {
    id: "C02",
    category: "connection",
    trait: "first_interaction",
    question: "Your ideal first interaction with your match would be:",
    options: [
      {
        id: "A",
        text: "Sit somewhere and have a proper conversation",
        value: "conversation",
      },
      { id: "B", text: "Walk around the event and talk", value: "walk" },
      { id: "C", text: "Dance together and have fun", value: "dance" },
      {
        id: "D",
        text: "Start with something fun and let the conversation happen naturally",
        value: "natural_fun",
      },
    ],
  },
];

export function getSanitizedQuestionnaire() {
  return questionnaire.map(({ id, category, trait, question, options }) => ({
    id,
    category,
    trait,
    question,
    options: options.map(({ id, text }) => ({ id, text })),
  }));
}
