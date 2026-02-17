const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const {
  createCommentValidation,
  mongoIdValidation,
} = require("../middleware/validation");
const {
  getCommentsByPost,
  createComment,
  updateComment,
  deleteComment,
  getCommenters,
} = require("../controllers/commentController");

// Get comments for a post (public)
router.get("/post/:postId", mongoIdValidation("postId"), getCommentsByPost);
router.get(
  "/post/:postId/commenters",
  mongoIdValidation("postId"),
  getCommenters,
);

// Protected routes
router.post(
  "/post/:postId",
  authenticate,
  mongoIdValidation("postId"),
  createCommentValidation,
  createComment,
);
router.put(
  "/:id",
  authenticate,
  mongoIdValidation("id"),
  createCommentValidation,
  updateComment,
);
router.delete("/:id", authenticate, mongoIdValidation("id"), deleteComment);

module.exports = router;
