const express = require("express");
const router = express.Router();
const {
  getCategories,
  createCategory,
} = require("../controllers/categoryController");
const { authenticate } = require("../middleware/auth");

// Public routes
router.get("/", getCategories);

// Protected routes (could be restricted to admin later)
router.post("/", authenticate, createCategory);

module.exports = router;
