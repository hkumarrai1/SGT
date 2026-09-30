import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { env } from "../config/env.js";

export async function createOrVerifyUser(email) {
  return User.findOneAndUpdate(
    { email },
    { $set: { isEmailVerified: true } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

export function createAuthToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email },
    env.jwtSecret,
    { expiresIn: "7d" },
  );
}

export function verifyAuthToken(token) {
  return jwt.verify(token, env.jwtSecret);
}
