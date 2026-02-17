const express = require("express");
const router = express.Router();
const { authenticate, optionalAuth } = require("../middleware/auth");
const {
  createPostValidation,
  mongoIdValidation,
} = require("../middleware/validation");
const {
  getAllPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  hidePost,
  getUserPosts,
  sharePost,
  getRelatedPosts,
} = require("../controllers/postController");

// Public routes (with optional auth for viewing own drafts)
router.get("/", optionalAuth, getAllPosts);
router.get("/:id", mongoIdValidation("id"), optionalAuth, getPostById);
router.get("/:id/related", mongoIdValidation("id"), getRelatedPosts);
router.get(
  "/user/:userId",
  mongoIdValidation("userId"),
  optionalAuth,
  getUserPosts,
);

// Protected routes
router.post("/", authenticate, createPostValidation, createPost);
router.put(
  "/:id",
  authenticate,
  mongoIdValidation("id"),
  createPostValidation,
  updatePost,
);
router.delete("/:id", authenticate, mongoIdValidation("id"), deletePost);
router.patch("/:id/hide", authenticate, mongoIdValidation("id"), hidePost);
router.post("/:id/share", mongoIdValidation("id"), sharePost);

module.exports = router;
