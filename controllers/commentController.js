const Comment = require("../models/Comment");
const Post = require("../models/Post");

// Get all comments for a post
const getCommentsByPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const comments = await Comment.find({
      postId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Comment.countDocuments({
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
    const post = await Post.findOne({
      _id: postId,
      status: "published",
      isDeleted: false,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found or not available for comments",
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

    // Aggregate to get unique users who commented
    const commenters = await Comment.aggregate([
      {
        $match: {
          postId: new require("mongoose").Types.ObjectId(postId),
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
