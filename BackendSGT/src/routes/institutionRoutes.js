import { Router } from "express";
import { listActiveInstitutions } from "../controllers/institutionController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/", requireAuth, asyncHandler(listActiveInstitutions));

export default router;
