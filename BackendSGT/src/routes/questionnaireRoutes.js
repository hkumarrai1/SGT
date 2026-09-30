import { Router } from "express";
import {
  getQuestionnaire,
  submitQuestionnaire,
} from "../controllers/questionnaireController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, asyncHandler(getQuestionnaire));
router.post("/submit", requireAuth, asyncHandler(submitQuestionnaire));

export default router;
