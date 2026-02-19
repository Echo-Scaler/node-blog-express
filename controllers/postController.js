const Post = require("../models/Post");
const Category = require("../models/Category");
const User = require("../models/User");
const fs = require("fs");
const path = require("path");

// Helper to generate unique slug
async function generateSlug(title, excludeId = null) {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 100);

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = { slug };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const exists = await Post.findOne(query);
    if (!exists) break;

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
}

// @desc    Get all public posts (feed)
// @route   GET /api/posts
// @access  Public
exports.getAllPosts = async (req, res) => {
  try {
    const { category, tag, search, page = 1, limit = 12 } = req.query;
    const skip = (page - 1) * limit;

    const query = {
      visibility: "public",
      // Show if published AND (not scheduled OR scheduled time passed)
      $or: [{ scheduledAt: null }, { scheduledAt: { $lte: new Date() } }],
    };

    if (category) {
      const cat = await Category.findOne({ slug: category });
      if (cat) query.categoryId = cat._id;
    }

    if (tag) {
      query.tags = tag;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    const posts = await Post.find(query)
      .populate("userId", "username displayName avatar url")
      .populate("categoryId", "name slug color")
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Post.countDocuments(query);

    res.json({
      success: true,
      count: posts.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      posts: posts.map((p) => ({
        ...p.toObject(),
        author: p.userId, // Map userId to author for frontend consistency if needed
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get single post by ID or Slug
// @route   GET /api/posts/:id
// @access  Public (Optional Auth for drafts)
exports.getPostById = async (req, res) => {
  try {
    // Check if valid ObjectId, otherwise treat as slug
    let query;
    if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      query = { _id: req.params.id };
    } else {
      query = { slug: req.params.id };
    }

    const post = await Post.findOne(query)
      .populate("userId", "username displayName avatar bio")
      .populate("categoryId", "name slug color icon");

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    // Access Control
    const user = req.user;
    const isAuthor = user && post.userId._id.toString() === user.id.toString();
    const isAdmin = user && user.role === "admin";
    const isMember = user && (user.role === "member" || isAdmin || isAuthor);

    if (post.visibility === "draft" && !isAuthor && !isAdmin) {
      return res
        .status(403)
        .json({ success: false, message: "Access denied: This is a draft." });
    }

    if (post.visibility === "private" && !isMember) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Members only content.",
      });
    }

    // Increment views (naive implementation)
    // In production, use a separate collection or Redis to prevent spam
    if (post.visibility === "public") {
      post.viewCount += 1;
      await post.save({ validateBeforeSave: false });
    }

    res.json({ success: true, post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private
exports.createPost = async (req, res) => {
  try {
    const {
      title,
      subtitle,
      content,
      categoryId,
      tags,
      visibility = "draft",
      scheduledAt,
      metaTitle,
      metaDescription,
    } = req.body;

    const slug = await generateSlug(title);

    // Determine timestamps
    let publishedAt = null;
    let finalScheduledAt = null;

    if (visibility === "public") {
      if (scheduledAt) {
        finalScheduledAt = new Date(scheduledAt);
      } else {
        publishedAt = new Date();
      }
    }

    // Handle Image Upload (Local or Cloudinary if configured)
    let imageUrl = "";
    if (req.file) {
      // Assuming existing middleware set req.file.path or req.file.location
      // For local upload via multer diskStorage:
      imageUrl = `/uploads/${req.file.filename}`;
    }

    // Validate Read Time
    const wpm = 200;
    const words = content ? content.trim().split(/\s+/).length : 0;
    const readTimeMins = Math.ceil(words / wpm);

    // Validate Category ID if present
    if (categoryId && !require("mongoose").Types.ObjectId.isValid(categoryId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid category ID" });
    }

    const post = await Post.create({
      userId: req.user.id,
      username: req.user.username, // NEW: Required by Post model
      title,
      subtitle,
      slug,
      content,
      categoryId: categoryId || undefined, // undefined prevents CastError for empty string
      tags,
      image: imageUrl,
      visibility,
      scheduledAt: finalScheduledAt,
      publishedAt,
      metaTitle,
      metaDescription,
      readTimeMins,
      // Default to true for now
      allowComments: true,
    });

    res.status(201).json({
      success: true,
      message:
        visibility === "public" && !scheduledAt
          ? "Post published!"
          : "Post saved.",
      post,
    });
  } catch (err) {
    console.error("DEBUG: createPost failed — error details:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// @desc    Update a post
// @route   PUT /api/posts/:id
// @access  Private
exports.updatePost = async (req, res) => {
  try {
    let post = await Post.findById(req.params.id);

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    // Check ownership
    if (post.userId.toString() !== req.user.id && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    const {
      title,
      subtitle,
      content,
      categoryId,
      tags,
      visibility,
      scheduledAt,
      metaTitle,
      metaDescription,
    } = req.body;

    // Handle Image Update
    if (req.file) {
      // Optional: Delete old image if it's local
      // if (post.image && post.image.startsWith('/uploads/')) { ... }
      post.image = `/uploads/${req.file.filename}`;
    }

    if (title && title !== post.title) {
      post.title = title;
      // Maybe update slug? Usually better to keep slug stable for SEO,
      // but if it's a draft it might be okay. Let's keep it stable for now.
    }

    if (subtitle) post.subtitle = subtitle;
    if (content) {
      post.content = content;
      const wpm = 200;
      const words = content.trim().split(/\s+/).length;
      post.readTimeMins = Math.ceil(words / wpm);
    }
    if (categoryId) {
      // Validate categoryId before assigning
      if (require("mongoose").Types.ObjectId.isValid(categoryId)) {
        post.categoryId = categoryId;
      } else {
        // Optionally, handle invalid categoryId, e.g., log or return an error
        console.warn(`Invalid categoryId provided: ${categoryId}`);
        // You might want to return an error here or ignore the invalid ID
        // For now, we'll just skip updating categoryId if it's invalid
      }
    }
    if (tags) post.tags = tags;
    if (metaTitle) post.metaTitle = metaTitle;
    if (metaDescription) post.metaDescription = metaDescription;

    // Handle Visibility Changes
    if (visibility && visibility !== post.visibility) {
      if (visibility === "public") {
        // Draft/Private -> Public
        if (!post.publishedAt) {
          post.publishedAt = new Date(); // Publish now!
        }
      } else {
        // Public -> Draft/Private
        post.publishedAt = null; // Unpublish
      }
      post.visibility = visibility;
    }

    // Handle Scheduling
    if (scheduledAt) {
      post.scheduledAt = new Date(scheduledAt);
      // If scheduling, ensure we don't treat it as immediately published
      if (post.visibility === "public" && post.scheduledAt > new Date()) {
        // It will be visible only when time comes
      }
    } else if (scheduledAt === "") {
      post.scheduledAt = null;
    }

    await post.save();

    res.json({
      success: true,
      message: "Post updated",
      post,
    });
  } catch (err) {
    console.error("DEBUG: updatePost failed — error details:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    if (post.userId.toString() !== req.user.id && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    await post.deleteOne();

    res.json({ success: true, message: "Post removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Hide/Unhide (Legacy Support -> Update Visiblity)
// @route   PATCH /api/posts/:id/hide
// @access  Private
exports.hidePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post)
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });

    if (post.userId.toString() !== req.user.id && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    await post.toggleVisibility(); // Uses the method we updated in Post model

    res.json({ success: true, data: post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get user's posts
// @route   GET /api/posts/user/:userId
// @access  Public
exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 12, q, status, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;

    // If viewing own profile, show everything (unless filtered). Else show public.
    const isOwner = req.user && req.user.id === userId;

    const query = { userId };

    // Visibility filter
    if (isOwner) {
      if (status) {
        // Dashboard sends 'status' but DB uses 'visibility'
        // Map 'published' -> 'public', 'hidden' -> 'private' (or whatever mapping we decide)
        // Actually dashboard.js sends 'published', 'draft', 'hidden'.
        // DB uses 'public', 'draft', 'private'.
        // Let's create a map or just allow direct values if updated in frontend
        if (status === "published") query.visibility = "public";
        else if (status === "hidden")
          query.visibility = "private"; // Assuming hidden means private
        else if (status === "draft") query.visibility = "draft";
        else query.visibility = status;
      }
    } else {
      query.visibility = "public";
      query.$or = [
        { scheduledAt: null },
        { scheduledAt: { $lte: new Date() } },
      ];
    }

    // Search filter
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: "i" } },
        { content: { $regex: q, $options: "i" } },
      ];
      // Ensure visibility constraint applies to OR group if we were just adding strict conditions
      // But query structure needs care if mixing AND ($or for visi) and OR (for search).
      // Actually, standard visibility is top-level.
      // If not owner, we have $or for scheduling.
      // If we add another $or for search, they conflict (overwrite).
      // We must use $and for complex combinations.

      if (!isOwner) {
        // We have strict visibility="public".
        // We have scheduling OR condition.
        // We have search OR condition.

        // Re-construct query properly for public view + search:
        // query = { userId, visibility: "public", $and: [ { $or: [scheduled...] }, { $or: [title..., content...] } ] }

        delete query.$or; // Remove the simple scheduling check setup above

        query.$and = [
          {
            $or: [{ scheduledAt: null }, { scheduledAt: { $lte: new Date() } }],
          },
          {
            $or: [
              { title: { $regex: q, $options: "i" } },
              { content: { $regex: q, $options: "i" } },
            ],
          },
        ];
      } else {
        // Owner: just search
        query.$or = [
          { title: { $regex: q, $options: "i" } },
          { content: { $regex: q, $options: "i" } },
        ];
      }
    }

    // Date filters
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const posts = await Post.find(query)
      .populate("categoryId", "name slug color")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Post.countDocuments(query);

    res.json({
      success: true,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page: parseInt(page),
        limit: parseInt(limit),
      },
      posts: posts.map((p) => ({
        ...p.toObject(),
        // Ensure frontend compatibility (dashboard expects status, model has visibility)
        status:
          p.visibility === "public"
            ? "published"
            : p.visibility === "private"
              ? "hidden"
              : "draft",
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Search posts
// @route   GET /api/posts/search
// @access  Public
exports.searchPosts = async (req, res) => {
  // Redirect to getAllPosts with search query
  req.query.search = req.query.q || req.query.search;
  return exports.getAllPosts(req, res);
};

//Stub for sharePost
exports.sharePost = async (req, res) => {
  res.status(501).json({ success: false, message: "Not implemented" });
};

//Stub for getRelatedPosts
exports.getRelatedPosts = async (req, res) => {
  try {
    // Basic implementation: same category, exclude current
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.json({ success: true, posts: [] });
    }

    const related = await Post.find({
      categoryId: post.categoryId,
      _id: { $ne: post._id },
      visibility: "public",
      $or: [{ scheduledAt: null }, { scheduledAt: { $lte: new Date() } }],
    })
      .limit(3)
      .populate("userId", "username displayName avatar");

    res.json({ success: true, posts: related });
  } catch (err) {
    console.error(err);
    res.json({ success: true, posts: [] }); // Fail gracefully
  }
};
