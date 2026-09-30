import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  requireDashboardAccess,
  requireVerified,
} from "../middleware/stageAuth.js";

const router = Router();
router.get("/questionnaire", requireAuth, requireVerified, (req, res) =>
  res.json({
    success: true,
    questionnaireStatus: "AVAILABLE",
    message: "Questionnaire stage is ready.",
  }),
);
router.get("/dashboard", requireAuth, requireDashboardAccess, (req, res) =>
  res.json({ success: true, message: "Dashboard access granted." }),
);
export default router;
