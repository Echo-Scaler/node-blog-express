const mongoose = require("mongoose");
require("dotenv").config();
const Post = require("./models/Post");
const User = require("./models/User");
const Category = require("./models/Category");

async function testQuery() {
  try {
    const uri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/blog-system";
    await mongoose.connect(uri);
    console.log("Connected to MongoDB:", uri);

    const totalPosts = await Post.countDocuments({});
    console.log("Total posts in database:", totalPosts);

    const totalUsers = await User.countDocuments({});
    console.log("Total users in database:", totalUsers);

    if (totalUsers > 0) {
      const users = await User.find({}).limit(5);
      console.log(
        "Sample users:",
        JSON.stringify(
          users.map((u) => ({ id: u._id, username: u.username })),
          null,
          2,
        ),
      );
    }

    const nonDeletedPosts = await Post.countDocuments({ isDeleted: false });
    console.log("Non-deleted posts:", nonDeletedPosts);

    const query = { isDeleted: false };
    const posts = await Post.find(query)
      .limit(5)
      .populate("userId", "username")
      .populate("categoryId", "name");

    console.log("Query results (first 5):", JSON.stringify(posts, null, 2));

    process.exit(0);
  } catch (err) {
    console.error("Test error:", err);
    process.exit(1);
  }
}

testQuery();
