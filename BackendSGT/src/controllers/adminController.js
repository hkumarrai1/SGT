import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function adminLogin(req, res) {
  const { adminId, password } = req.body || {};
  if (adminId !== env.adminId || password !== env.adminPassword)
    return res
      .status(401)
      .json({ success: false, message: "Invalid admin credentials." });
  const token = jwt.sign(
    { role: "admin", adminId: env.adminId },
    env.jwtSecret,
    { expiresIn: "4h" },
  );
  return res.json({ success: true, token });
}
