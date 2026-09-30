import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import {
  findMatch,
  getActiveMatch,
  getMatchSession,
  declineActiveMatch,
} from "../controllers/matchController.js";
import {
  getMatchChat,
  getAllMatchConversations,
  sendChatMessage,
  revealProfile,
  endMatch,
} from "../controllers/chatController.js";

const router = Router();

router.use(requireAuth);

router.post("/find", asyncHandler(findMatch));
router.get("/current", asyncHandler(getActiveMatch));
router.get("/session", asyncHandler(getMatchSession));
router.get("/conversations", asyncHandler(getAllMatchConversations));
router.post("/:matchId/decline", asyncHandler(declineActiveMatch));

// Chat & Mutual Reveal Endpoints
router.get("/:matchId/chat", asyncHandler(getMatchChat));
router.get("/:matchId/messages", asyncHandler(getMatchChat));
router.post("/:matchId/messages", asyncHandler(sendChatMessage));
router.post("/:matchId/reveal", asyncHandler(revealProfile));
router.post("/:matchId/unmatch", asyncHandler(endMatch));

export default router;
