const { body, param, validationResult } = require("express-validator");

// Middleware to check validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
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

// Validation rules for creating a post
const createPostValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 200 })
    .withMessage("Title cannot exceed 200 characters"),
  body("content").trim().notEmpty().withMessage("Content is required"),
  body("status")
    .optional()
    .isIn(["published", "draft", "hidden"])
    .withMessage("Invalid status"),
  body("tags").optional().isArray().withMessage("Tags must be an array"),
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
