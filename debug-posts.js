const mongoose = require("mongoose");
const Post = require("./models/Post");
const Category = require("./models/Category");
require("dotenv").config();

const debugPosts = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const page = 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const query = {
      status: "published",
      isDeleted: false,
    };

    // Simulate controller logic
    const categoryIdInput = "invalid-id-slug-test";
    if (mongoose.isValidObjectId(categoryIdInput)) {
      query.categoryId = categoryIdInput;
    } else {
      console.log("Validation working: Invalid ID ignored.");
    }

    console.log("Running query:", query);

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-isDeleted")
      .populate("categoryId", "name color slug");

    console.log("Query successful. Found", posts.length, "posts.");

    if (posts.length > 0) {
      console.log("First post categoryId:", posts[0].categoryId);
    }

    const total = await Post.countDocuments(query);
    console.log("Total count:", total);

    process.exit(0);
  } catch (error) {
    console.error("DEBUG ERROR:", error);
    process.exit(1);
  }
};

debugPosts();
