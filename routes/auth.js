const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const {
  registerValidation,
  loginValidation,
} = require("../middleware/validation");
const {
  register,
  login,
  getProfile,
  updateProfile,
  logout,
} = require("../controllers/authController");

// Public routes
router.post("/register", registerValidation, register);
router.post("/login", loginValidation, login);

// Protected routes
router.get("/profile", authenticate, getProfile);
router.put("/profile", authenticate, updateProfile);
router.post("/logout", authenticate, logout);

module.exports = router;
