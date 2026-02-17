const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

// Import routes
const authRoutes = require("./routes/auth");
const postRoutes = require("./routes/posts");
const commentRoutes = require("./routes/comments");
const replyRoutes = require("./routes/replies");
const reactionRoutes = require("./routes/reactions");
const categoryRoutes = require("./routes/categories");
const newsRoutes = require("./routes/news");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Static files
app.use(express.static(path.join(__dirname, "public")));

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/replies", replyRoutes);
app.use("/api/reactions", reactionRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/news", newsRoutes);

// CMS Routes (Web Interface)
app.get("/", (req, res) => {
  res.render("index", { title: "Byte & Beyond" });
});

app.get("/dashboard", (req, res) => {
  res.render("dashboard/index", { title: "Dashboard" });
});

app.get("/posts/create", (req, res) => {
  res.render("posts/create", { title: "Create Post" });
});

app.get("/posts/:id/edit", (req, res) => {
  res.render("posts/edit", { title: "Edit Post", postId: req.params.id });
});

app.get("/posts/:id", (req, res) => {
  res.render("posts/view", { title: "View Post", postId: req.params.id });
});

app.get("/login", (req, res) => {
  res.render("auth/login", { title: "Login" });
});

app.get("/register", (req, res) => {
  res.render("auth/register", { title: "Register" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

module.exports = app;
