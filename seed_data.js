const mongoose = require("mongoose");
const dotenv = require("dotenv");
const connectDB = require("./config/database");
const User = require("./models/User");
const Category = require("./models/Category");
const Post = require("./models/Post");

// Load env vars
dotenv.config();

// Connect to DB
connectDB();

const importData = async () => {
  try {
    // Clear existing data
    await Post.deleteMany();
    await Category.deleteMany();
    await User.deleteMany();

    console.log("Data Destroyed...");

    // Create Users
    const user = await User.create({
      username: "demo_user",
      email: "demo@example.com",
      password: "password123", // Will be hashed by pre-save hook
      displayName: "Demo User",
      bio: "I am a demo user created by the seed script.",
      isActive: true,
    });

    const admin = await User.create({
      username: "admin_user",
      email: "admin@example.com",
      password: "password123",
      displayName: "Admin User",
      bio: "I am the admin.",
      isActive: true,
      role: "admin", // Assuming schema supports role, though not explicitly seen in User.js view but often standard
    });

    console.log("Users Created...");

    // Create Categories
    const categories = await Category.insertMany([
      {
        name: "Technology",
        description: "Latest gadgets and software trends.",
        color: "#3b82f6",
        icon: "cpu",
        sortOrder: 1,
      },
      {
        name: "Business",
        description: "Finance, markets, and economic news.",
        color: "#ef4444",
        icon: "trending-up",
        sortOrder: 2,
      },
      {
        name: "Entertainment",
        description: "Movies, music, and celebrity culture.",
        color: "#8b5cf6",
        icon: "film",
        sortOrder: 3,
      },
      {
        name: "Health",
        description: "Wellness, medicine, and fitness.",
        color: "#10b981",
        icon: "heart",
        sortOrder: 4,
      },
      {
        name: "Science",
        description: "Physics, biology, and space exploration.",
        color: "#06b6d4",
        icon: "beaker",
        sortOrder: 5,
      },
    
      {
        name: "Design",
        description: "UI/UX, Graphic Design, and Art.",
        color: "#ec4899",
        icon: "pen-tool",
        sortOrder: 7,
      },
      {
        name: "Travel",
        description: "Destinations, tips, and adventures.",
        color: "#6366f1",
        icon: "map",
        sortOrder: 8,
      },
     
    ]);

    console.log("Categories Created...");

    // Create Posts sequentially
    const postData = [
      {
        userId: user._id,
        username: user.username,
        title: "The Future of Web Development",
        slug: "the-future-of-web-development",
        subtitle: "Exploring the next generation of frameworks and tools.",
        content:
          "<p>Web development is constantly evolving. From static sites to SPAs and now hydration and islands architecture...</p>",
        categoryId: categories[0]._id,
        tags: ["web", "javascript", "future"],
        visibility: "public",
        publishedAt: new Date(),
        readTimeMins: 5,
        viewCount: 120,
      },
      {
        userId: user._id,
        username: user.username,
        title: "Draft: My Secret Project",
        slug: "draft-my-secret-project",
        subtitle: "Work in progress...",
        content:
          "<p>This is a draft post that should not be visible to the public.</p>",
        categoryId: categories[0]._id,
        tags: ["secret", "wip"],
        visibility: "draft",
      },
      {
        userId: user._id,
        username: user.username,
        title: "Members Only: Exclusive Content",
        slug: "members-only-exclusive-content",
        subtitle: "For subscribers only.",
        content: "<p>This content is restricted to members.</p>",
        categoryId: categories[6]._id, // Design
        tags: ["exclusive", "premium"],
        visibility: "private",
        publishedAt: new Date(),
      },
      {
        userId: user._id,
        username: user.username,
        title: "Scheduled: Coming Soon",
        slug: "scheduled-coming-soon",
        subtitle: "Get ready for something big.",
        content: "<p>This post is scheduled for the future.</p>",
        categoryId: categories[7]._id, // Travel
        tags: ["future", "scheduled"],
        visibility: "public",
        scheduledAt: new Date(Date.now() + 86400000), // Tomorrow
      },
    ];

    for (const p of postData) {
      console.log("Creating post:", p.title);
      await Post.create(p);
    }

    console.log("Posts Created...");
    console.log("Data Imported!");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

importData();
