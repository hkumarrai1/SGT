export function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function isValidEmail(email) {
  const normalized = normalizeEmail(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

export function isCampusEmail(email) {
  return isValidEmail(email);
}

export function isValidOtp(otp) {
  return typeof otp === "string" && /^\d{6}$/.test(otp);
}

