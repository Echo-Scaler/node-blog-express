const mongoose = require("mongoose");
const Post = require("../models/Post");
const User = require("../models/User");
const dotenv = require("dotenv");

// Load env vars
dotenv.config({ path: "../.env" });

// Connect to DB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

const seedPosts = async () => {
  try {
    const user = await User.findOne();
    if (!user) {
      console.log("No user found.");
      process.exit(1);
    }

    const posts = [];
    for (let i = 1; i <= 15; i++) {
      posts.push({
        title: `Local Story #${i}`,
        content: `This is a test post #${i} to verify pagination logic.`,
        status: "published",
        user: user._id,
        createdAt: new Date(Date.now() - i * 1000 * 60 * 60),
      });
    }

    await Post.deleteMany({ title: /^Local Story #/ }); // Clean old test data
    await Post.insertMany(posts);
    console.log("Seeded 15 posts successfully!");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedPosts();
