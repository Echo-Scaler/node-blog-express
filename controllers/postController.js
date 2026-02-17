const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Reaction = require("../models/Reaction");

// Get all published posts with pagination
const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const categoryId = req.query.categoryId;

    const query = {
      status: "published",
      isDeleted: false,
    };

    if (categoryId) {
      const mongoose = require("mongoose");
      if (mongoose.isValidObjectId(categoryId)) {
        query.categoryId = categoryId;
      } else {
        // Invalid ID (e.g. from Global feed slug), ignore it or return error.
        // Ignoring it allows fallback to "All Posts" which is better than crashing.
        console.warn(`Invalid categoryId received: ${categoryId}`);
      }
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-isDeleted")
      .populate("categoryId", "name color slug");

    const total = await Post.countDocuments(query);

    res.json({
      success: true,
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get all posts error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching posts",
      error: error.message,
    });
  }
};

// Get single post by ID
const getPostById = async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).populate("categoryId", "name color slug");

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Check if user can view this post
    if (post.status !== "published") {
      // Only owner can view draft/hidden posts
      if (!req.userId || post.userId.toString() !== req.userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to view this post",
        });
      }
    }

    // Increment view count
    post.viewCount += 1;
    await post.save();

    res.json({
      success: true,
      post,
    });
  } catch (error) {
    console.error("Get post error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching post",
      error: error.message,
    });
  }
};

// Create new post
const createPost = async (req, res) => {
  try {
    const { title, content, excerpt, status, tags, categoryId } = req.body;
    let image = "";

    if (req.file) {
      image = "/uploads/" + req.file.filename;
    }

    const post = new Post({
      userId: req.userId,
      username: req.user.username,
      title,
      content,
      excerpt,
      status: status || "published",
      tags: tags || [],
      categoryId,
      image,
    });

    await post.save();

    res.status(201).json({
      success: true,
      message: "Post created successfully",
      post,
    });
  } catch (error) {
    console.error("Create post error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating post",
      error: error.message,
    });
  }
};

// Update post
const updatePost = async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Check ownership
    if (!post.canEdit(req.userId)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to edit this post",
      });
    }

    // Update fields
    const { title, content, excerpt, status, tags, categoryId } = req.body;
    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = content;
    if (excerpt !== undefined) post.excerpt = excerpt;
    if (status !== undefined) post.status = status;
    if (tags !== undefined) post.tags = tags;
    if (categoryId !== undefined) post.categoryId = categoryId;

    if (req.file) {
      post.image = "/uploads/" + req.file.filename;
    }

    await post.save();

    res.json({
      success: true,
      message: "Post updated successfully",
      post,
    });
  } catch (error) {
    console.error("Update post error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating post",
      error: error.message,
    });
  }
};

// Delete post (soft delete)
const deletePost = async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Check ownership
    if (!post.canDelete(req.userId)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this post",
      });
    }

    post.isDeleted = true;
    await post.save();

    res.json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("Delete post error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting post",
      error: error.message,
    });
  }
};

// Toggle post visibility (hide/show)
const hidePost = async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Check ownership
    if (!post.canEdit(req.userId)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to modify this post",
      });
    }

    await post.toggleVisibility();

    res.json({
      success: true,
      message: `Post ${post.status === "hidden" ? "hidden" : "published"} successfully`,
      post,
    });
  } catch (error) {
    console.error("Hide post error:", error);
    res.status(500).json({
      success: false,
      message: "Error toggling post visibility",
      error: error.message,
    });
  }
};

// Get posts by user
const getUserPosts = async (req, res) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build query
    const query = { userId, isDeleted: false };

    // If not the owner, only show published posts
    if (!req.userId || req.userId.toString() !== userId) {
      query.status = "published";
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments(query);

    res.json({
      success: true,
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get user posts error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user posts",
      error: error.message,
    });
  }
};

// Increment share count
const sharePost = async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      status: "published",
      isDeleted: false,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    post.shareCount += 1;
    await post.save();

    res.json({
      success: true,
      message: "Post shared successfully",
      shareCount: post.shareCount,
    });
  } catch (error) {
    console.error("Share post error:", error);
    res.status(500).json({
      success: false,
      message: "Error sharing post",
      error: error.message,
    });
  }
};

// Get related posts (same category)
const getRelatedPosts = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, isDeleted: false });
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    const query = {
      _id: { $ne: post._id },
      status: "published",
      isDeleted: false,
    };

    if (post.categoryId) {
      query.categoryId = post.categoryId;
    }

    const relatedPosts = await Post.find(query)
      .sort({ createdAt: -1 })
      .limit(3)
      .populate("categoryId", "name color slug");

    res.json({
      success: true,
      posts: relatedPosts,
    });
  } catch (error) {
    console.error("Get related posts error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching related posts",
      error: error.message,
    });
  }
};

module.exports = {
  getAllPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  hidePost,
  getUserPosts,
  sharePost,
  getRelatedPosts,
};
