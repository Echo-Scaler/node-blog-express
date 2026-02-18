const express = require("express");
const router = express.Router();
const { authenticate, optionalAuth } = require("../middleware/auth");
const {
  createReplyValidation,
  mongoIdValidation,
} = require("../middleware/validation");
const {
  getRepliesByComment,
  createReply,
  updateReply,
  deleteReply,
} = require("../controllers/replyController");

// Get replies for a comment (public)
router.get(
  "/comment/:commentId",
  optionalAuth,
  mongoIdValidation("commentId"),
  getRepliesByComment,
);

// Protected routes
router.post(
  "/comment/:commentId",
  authenticate,
  mongoIdValidation("commentId"),
  createReplyValidation,
  createReply,
);
router.put(
  "/:id",
  authenticate,
  mongoIdValidation("id"),
  createReplyValidation,
  updateReply,
);
router.delete("/:id", authenticate, mongoIdValidation("id"), deleteReply);

module.exports = router;
