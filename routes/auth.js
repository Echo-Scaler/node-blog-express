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
  getAllUsers,
  logout,
} = require("../controllers/authController");

// Public routes
router.post("/register", registerValidation, register);
router.post("/login", loginValidation, login);

const upload = require("../middleware/upload");

// Protected routes
router.get("/profile", authenticate, getProfile);
router.put("/profile", authenticate, upload.single("avatar"), updateProfile);
router.get("/users", authenticate, getAllUsers);
router.post("/logout", authenticate, logout);

module.exports = router;
