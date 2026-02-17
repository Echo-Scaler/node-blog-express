const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const {
  createReactionValidation,
  mongoIdValidation,
} = require("../middleware/validation");
const {
  addReaction,
  removeReaction,
  getReactions,
} = require("../controllers/reactionController");

// Get reactions for a target (public)
router.get("/:targetType/:targetId", getReactions);

// Protected routes
router.post("/", authenticate, createReactionValidation, addReaction);
router.delete("/:id", authenticate, mongoIdValidation("id"), removeReaction);

module.exports = router;
