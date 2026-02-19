const { body, param, validationResult } = require("express-validator");

// Middleware to check validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

// Validation rules for user registration
const registerValidation = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores"),
  body("email")
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  validate,
];

// Validation rules for login
const loginValidation = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
  validate,
];

const toArray = (value) => {
  console.log("Sanitizing tags:", value, "Type:", typeof value);
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) return value;
  try {
    // Handle JSON stringified array if that ever happens
    if (
      typeof value === "string" &&
      value.startsWith("[") &&
      value.endsWith("]")
    ) {
      return JSON.parse(value);
    }
  } catch (e) {
    console.error("Tags sanitization error:", e);
    return []; // Return empty array on error instead of falling through to [value] which might be bad JSON string
  }
  return [value];
};

// Validation rules for creating a post
const createPostValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 200 })
    .withMessage("Title cannot exceed 200 characters"),
  body("subtitle")
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Subtitle cannot exceed 255 characters"),
  body("content").trim(), // Content might be empty for drafts
  body("visibility")
    .optional()
    .isIn(["public", "draft", "private"])
    .withMessage("Invalid visibility"),
  body("scheduledAt")
    .optional()
    .isISO8601()
    .withMessage("Invalid scheduled date"),

  // Sanitize tags to ensure they are always an array
  body("tags").customSanitizer((value) => {
    if (value === undefined || value === null || value === "") return [];
    if (Array.isArray(value)) return value;
    try {
      // Handle JSON stringified array
      if (
        typeof value === "string" &&
        value.trim().startsWith("[") &&
        value.trim().endsWith("]")
      ) {
        return JSON.parse(value);
      }
    } catch (e) {}
    // Comma-separated string or single value
    if (typeof value === "string" && value.includes(",")) {
      return value
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }
    return [value];
  }),

  body("tags").custom((value) => {
    if (!Array.isArray(value)) {
      throw new Error("Tags must be an array");
    }
    return true;
  }),

  validate,
];

// Validation rules for creating a comment
const createCommentValidation = [
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Comment content is required")
    .isLength({ max: 1000 })
    .withMessage("Comment cannot exceed 1000 characters"),
  validate,
];

// Validation rules for creating a reply
const createReplyValidation = [
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Reply content is required")
    .isLength({ max: 1000 })
    .withMessage("Reply cannot exceed 1000 characters"),
  validate,
];

// Validation rules for creating a reaction
const createReactionValidation = [
  body("targetType")
    .isIn(["post", "comment", "reply"])
    .withMessage("Invalid target type"),
  body("targetId").isMongoId().withMessage("Invalid target ID"),
  body("reactionType")
    .optional()
    .isIn(["like", "love", "insightful", "funny"])
    .withMessage("Invalid reaction type"),
  validate,
];

// Validation for MongoDB ObjectId params
const mongoIdValidation = (paramName) => [
  param(paramName).isMongoId().withMessage(`Invalid ${paramName}`),
  validate,
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  createPostValidation,
  createCommentValidation,
  createReplyValidation,
  createReactionValidation,
  mongoIdValidation,
};
