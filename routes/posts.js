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
  searchPosts,
  sharePost,
  getRelatedPosts,
} = require("../controllers/postController");

// Public routes (with optional auth for viewing own drafts)
router.get("/", optionalAuth, getAllPosts);
router.get("/search", authenticate, searchPosts);
router.get("/:id", mongoIdValidation("id"), optionalAuth, getPostById);
router.get("/:id/related", mongoIdValidation("id"), getRelatedPosts);
router.get(
  "/user/:userId",
  mongoIdValidation("userId"),
  optionalAuth,
  getUserPosts,
);

// Protected routes
const upload = require("../middleware/upload");

router.post(
  "/",
  authenticate,
  upload.single("image"),
  (req, res, next) => {
    // Force tags to be an array
    if (req.body.tags === undefined) {
      req.body.tags = [];
    } else if (typeof req.body.tags === "string") {
      req.body.tags = [req.body.tags];
    }
    // If it's already an array, leave it.
    // If it's something else (shouldn't be with multer + text fields), make it empty or array.

    console.log("Normalized Tags:", req.body.tags);
    next();
  },
  createPostValidation,
  createPost,
);
router.put(
  "/:id",
  authenticate,
  upload.single("image"),
  mongoIdValidation("id"),
  (req, res, next) => {
    // Force tags to be an array (same normalization as POST route)
    if (req.body.tags === undefined) {
      req.body.tags = [];
    } else if (typeof req.body.tags === "string") {
      req.body.tags = [req.body.tags];
    }
    next();
  },
  createPostValidation,
  updatePost,
);
router.delete("/:id", authenticate, mongoIdValidation("id"), deletePost);
router.patch("/:id/hide", authenticate, mongoIdValidation("id"), hidePost);
router.post("/:id/share", mongoIdValidation("id"), sharePost);

module.exports = router;
