import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function requireAdmin(req, res, next) {
  try {
    const header = req.get("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    const payload = token ? jwt.verify(token, env.jwtSecret) : null;
    if (!payload || payload.role !== "admin")
      throw new Error("invalid admin token");
    req.admin = { id: payload.adminId };
    next();
  } catch {
    res
      .status(401)
      .json({ success: false, message: "Admin authentication required." });
  }
}
