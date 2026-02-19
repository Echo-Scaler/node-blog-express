const Comment = require("../models/Comment");
const Post = require("../models/Post");
const mongoose = require("mongoose");

// Get all comments for a post
const getCommentsByPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const userId = req.userId; // Assuming authenticate or optionalAuth middleware sets this

    // Build aggregation pipeline
    const pipeline = [
      {
        $match: {
          postId: new mongoose.Types.ObjectId(postId),
          isDeleted: false,
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      // Lookup author details (avatar)
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "author",
        },
      },
      { $unwind: { path: "$author", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          userAvatar: "$author.avatar",
        },
      },
      { $project: { author: 0 } },
    ];

    // If user is logged in, check if they liked the comment
    if (userId) {
      pipeline.push({
        $lookup: {
          from: "reactions",
          let: { commentId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$targetId", "$$commentId"] },
                    { $eq: ["$targetType", "comment"] },
                    { $eq: ["$userId", new mongoose.Types.ObjectId(userId)] },
                  ],
                },
              },
            },
            { $project: { _id: 1 } },
          ],
          as: "userReaction",
        },
      });
      pipeline.push({
        $addFields: {
          isLiked: { $gt: [{ $size: "$userReaction" }, 0] },
        },
      });
      pipeline.push({
        $project: { userReaction: 0 },
      });
    }

    const comments = await Comment.aggregate(pipeline);

    const total = await Comment.countDocuments({
      postId,
      isDeleted: false,
    });

    // Calculate total including replies (Facebook-style count)
    const repliesCount = await mongoose.model("Reply").countDocuments({
      postId,
      isDeleted: false,
    });

    res.json({
      success: true,
      comments,
      pagination: {
        page,
        limit,
        total,
        totalWithReplies: total + repliesCount,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching comments",
      error: error.message,
    });
  }
};

// Create new comment
const createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;

    // Check if post exists
    const post = await Post.findById(postId);

    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Access Control for comments
    const user = req.user;
    const isAuthor = user && post.userId.toString() === user._id.toString();
    const isAdmin = user && user.role === "admin";
    const isMember = user && (user.role === "member" || isAdmin || isAuthor);

    // If it's a draft, only author and admin can comment
    if (post.visibility === "draft" && !isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You cannot comment on this draft.",
      });
    }

    // If it's private, only members (and author/admin) can comment
    if (post.visibility === "private" && !isMember) {
      return res.status(403).json({
        success: false,
        message: "This is a members-only story. Please join to comment.",
      });
    }

    // Check if comments are allowed
    if (post.allowComments === false) {
      return res.status(403).json({
        success: false,
        message: "Comments are disabled for this story",
      });
    }

    const comment = new Comment({
      postId,
      userId: req.userId,
      username: req.user.username,
      content,
    });

    await comment.save();

    // Increment comment count on post
    post.commentCount += 1;
    await post.save();

    res.status(201).json({
      success: true,
      message: "Comment created successfully",
      comment,
    });
  } catch (error) {
    console.error("Create comment error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating comment",
      error: error.message,
    });
  }
};

// Update comment
const updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const comment = await Comment.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check ownership
    if (!comment.canEdit(req.userId)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to edit this comment",
      });
    }

    comment.content = content;
    await comment.save();

    res.json({
      success: true,
      message: "Comment updated successfully",
      comment,
    });
  } catch (error) {
    console.error("Update comment error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating comment",
      error: error.message,
    });
  }
};

// Get unique commenters for a post
const getCommenters = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Post ID",
      });
    }

    // Aggregate to get unique users who commented
    const commenters = await Comment.aggregate([
      {
        $match: {
          postId: new mongoose.Types.ObjectId(postId),
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: "$userId",
          username: { $first: "$username" },
          lastCommentAt: { $max: "$createdAt" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $project: {
          _id: 1,
          username: 1,
          lastCommentAt: 1,
          // If you have an avatar field in User model, project it here
          // avatar: { $arrayElemAt: ["$userDetails.avatar", 0] }
        },
      },
      { $sort: { lastCommentAt: -1 } },
    ]);

    res.json({
      success: true,
      commenters,
    });
  } catch (error) {
    console.error("Get commenters error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching commenters",
      error: error.message,
    });
  }
};

// Delete comment (soft delete)
const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check ownership
    if (!comment.canDelete(req.userId)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this comment",
      });
    }

    comment.isDeleted = true;
    await comment.save();

    // Decrement comment count on post
    const post = await Post.findById(comment.postId);
    if (post) {
      post.commentCount = Math.max(0, post.commentCount - 1);
      await post.save();
    }

    res.json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting comment",
      error: error.message,
    });
  }
};

module.exports = {
  getCommentsByPost,
  createComment,
  updateComment,
  deleteComment,
  getCommenters,
};
