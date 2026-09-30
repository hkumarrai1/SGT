import Profile from "../models/Profile.js";

const allowedFields = new Set([
  "fullName",
  "dateOfBirth",
  "gender",
  "course",
  "academicYear",
  "studentId",
]);

const genderValues = new Set([
  "female",
  "male",
  "non-binary",
  "prefer-not-to-say",
]);
const academicYearValues = new Set(["1", "2", "3", "4", "5"]);

function invalid(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function normalizeText(value, field, maxLength) {
  if (typeof value !== "string") throw invalid(`${field} is required.`);
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > maxLength) {
    throw invalid(`${field} must be between 1 and ${maxLength} characters.`);
  }
  return normalized;
}

export function validateProfilePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw invalid("Profile data must be an object.");
  }

  const unexpected = Object.keys(payload).filter(
    (key) => !allowedFields.has(key),
  );
  if (unexpected.length)
    throw invalid(`Unexpected profile field: ${unexpected[0]}.`);

  const dateOfBirth = new Date(payload.dateOfBirth);
  if (
    !payload.dateOfBirth ||
    Number.isNaN(dateOfBirth.getTime()) ||
    dateOfBirth > new Date()
  ) {
    throw invalid("Enter a valid date of birth.");
  }
  const age = (Date.now() - dateOfBirth.getTime()) / 31557600000;
  if (age < 16 || age > 100)
    throw invalid("Date of birth must represent an age between 16 and 100.");

  const gender = payload.gender;
  if (!genderValues.has(gender)) throw invalid("Select a valid gender option.");
  if (!academicYearValues.has(payload.academicYear))
    throw invalid("Select a valid academic year.");

  return {
    fullName: normalizeText(payload.fullName, "Full name", 100),
    dateOfBirth,
    gender,
    course: normalizeText(payload.course, "Course", 100),
    academicYear: payload.academicYear,
    studentId: normalizeText(payload.studentId, "Student ID", 60),
    onboardingStatus: "PROFILE_COMPLETED",
  };
}

export async function getProfileForUser(userId) {
  return Profile.findOne({ userId })
    .populate("institutionId", "name shortName city")
    .lean();
}

export async function saveBasicProfile(userId, payload) {
  const profile = await Profile.findOne({ userId });
  if (!profile?.institutionId)
    throw invalid("Select your institution before completing your profile.");

  const updates = validateProfilePayload(payload);
  return Profile.findOneAndUpdate(
    { userId },
    { $set: updates },
    { new: true, runValidators: true },
  ).populate("institutionId", "name shortName city");
}
