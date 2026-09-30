import User from "../models/User.js";
import { verifyAuthToken } from "../services/authService.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.get("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });

    const payload = verifyAuthToken(token);
    const user = await User.findById(payload.sub).select("-__v");

    if (!user || !user.isEmailVerified) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    req.user = user;
    next();
  } catch {
    res
      .status(401)
      .json({ success: false, message: "Authentication required." });
  }
}
