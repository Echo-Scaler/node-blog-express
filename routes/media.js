const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const upload = require("../middleware/upload");
const {
  uploadMedia,
  getAllMedia,
  updateMedia,
  deleteMedia,
} = require("../controllers/mediaController");

// All media routes require authentication
router.use(authenticate);

// Upload media
router.post("/", upload.single("file"), uploadMedia);

// Get all media
router.get("/", getAllMedia);

// Update media
router.put("/:id", updateMedia);

// Delete media
router.delete("/:id", deleteMedia);

module.exports = router;
