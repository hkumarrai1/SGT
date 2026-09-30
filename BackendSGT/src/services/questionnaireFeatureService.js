import { categoryQuotas, questionnaire } from "../data/questionnaire.js";

function invalid(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function average(values) {
  if (!values.length) return null;
  return Number(
    (values.reduce((total, value) => total + value, 0) / values.length).toFixed(
      3,
    ),
  );
}

export function validateQuestionnaireAnswers(answerMap) {
  if (!answerMap || typeof answerMap !== "object" || Array.isArray(answerMap)) {
    throw invalid("Submit answers as a question-to-option map.");
  }

  const selectedByCategory = new Map();
  const answers = questionnaire.map((question) => {
    const optionId = answerMap[question.id];
    const option = question.options.find((item) => item.id === optionId);

    if (!option) {
      throw invalid(`Select a valid option for ${question.id}.`);
    }

    selectedByCategory.set(
      question.category,
      (selectedByCategory.get(question.category) || 0) + 1,
    );

    return {
      questionId: question.id,
      category: question.category,
      trait: question.trait,
      optionId: option.id,
      optionText: option.text,
      value: option.value,
    };
  });

  for (const [category, quota] of Object.entries(categoryQuotas)) {
    if (selectedByCategory.get(category) !== quota) {
      throw invalid("All questionnaire categories must be completed.");
    }
  }

  if (Object.keys(answerMap).some((key) => !questionnaire.some((q) => q.id === key))) {
    throw invalid("Questionnaire contains an unknown question.");
  }

  return answers;
}

export function extractQuestionnaireFeatures(answers) {
  const numericTraits = {};
  const categoricalTraits = {};
  const categoryScores = {};

  for (const answer of answers) {
    if (typeof answer.value === "number") {
      numericTraits[answer.trait] = answer.value;
      if (!categoryScores[answer.category]) categoryScores[answer.category] = [];
      categoryScores[answer.category].push(answer.value);
    } else {
      categoricalTraits[answer.trait] = answer.value;
    }
  }

  const socialEnergy = average(
    [
      numericTraits.social_energy,
      numericTraits.social_preference,
      numericTraits.group_social_energy,
    ].filter((value) => typeof value === "number"),
  );
  const eventEnergy = average(
    [
      numericTraits.dance_energy,
      numericTraits.group_social_energy,
      numericTraits.social_energy,
    ].filter((value) => typeof value === "number"),
  );
  const lifestyleEnergy = average(
    [numericTraits.adventure, numericTraits.adaptability].filter(
      (value) => typeof value === "number",
    ),
  );

  return {
    version: 1,
    numericTraits,
    categoricalTraits,
    categoryScores: Object.fromEntries(
      Object.entries(categoryScores).map(([category, values]) => [
        category,
        average(values),
      ]),
    ),
    derived: {
      socialEnergy,
      eventEnergy,
      lifestyleEnergy,
    },
  };
}
