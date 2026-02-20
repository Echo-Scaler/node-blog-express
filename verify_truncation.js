const { getAllPosts, getPostById } = require("./controllers/postController");
const Post = require("./models/Post");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

async function verifyTruncation() {
  await mongoose.connect(
    process.env.MONGO_URI || "mongodb://localhost:27017/blog",
  );

  try {
    // Create a dummy post with long content
    const post = await Post.create({
      title: "Verification Post",
      content: "A".repeat(500),
      visibility: "public",
      userId: new mongoose.Types.ObjectId(),
      username: "tester",
      slug: "verification-post-" + Date.now(),
    });

    console.log("Post created with 500 characters.");

    // Mock req and res for gest (no user)
    const req = {
      params: { id: post._id.toString() },
      user: null,
    };

    let responseData = null;
    const res = {
      json: (data) => {
        responseData = data;
      },
      status: () => res, // chainable
    };

    await getPostById(req, res);

    if (
      responseData &&
      responseData.isTruncated &&
      responseData.post.content.length === 400
    ) {
      console.log(
        "Verification SUCCESS: Content truncated to 400 chars and isTruncated is true.",
      );
    } else {
      console.log("Verification FAILED:", responseData);
    }

    // Clean up
    await Post.findByIdAndDelete(post._id);
  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await mongoose.connection.close();
  }
}

verifyTruncation();
