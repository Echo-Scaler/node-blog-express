const Reply = require("../models/Reply");
const Comment = require("../models/Comment");
const Post = require("../models/Post");

const mongoose = require("mongoose");

// Get all replies for a comment
const getRepliesByComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const userId = req.userId;

    const pipeline = [
      {
        $match: {
          commentId: new mongoose.Types.ObjectId(commentId),
          isDeleted: false,
        },
      },
      { $sort: { createdAt: 1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    if (userId) {
      pipeline.push({
        $lookup: {
          from: "reactions",
          let: { replyId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$targetId", "$$replyId"] },
                    { $eq: ["$targetType", "reply"] },
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

    // Add user avatar lookup
    pipeline.push({
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "author",
      },
    });
    pipeline.push({
      $unwind: { path: "$author", preserveNullAndEmptyArrays: true },
    });
    pipeline.push({
      $addFields: {
        userAvatar: "$author.avatar",
      },
    });
    pipeline.push({
      $project: { author: 0 },
    });

    const replies = await Reply.aggregate(pipeline);

    const total = await Reply.countDocuments({
      commentId,
      isDeleted: false,
    });

    res.json({
      success: true,
      replies,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get replies error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching replies",
      error: error.message,
    });
  }
};

// Create new reply
const createReply = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;

    // Check if comment exists
    const comment = await Comment.findOne({
      _id: commentId,
      isDeleted: false,
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check if post exists and is accessible
    const post = await Post.findById(comment.postId);

    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Access Control for replies
    const user = req.user;
    const isAuthor = user && post.userId.toString() === user._id.toString();
    const isAdmin = user && user.role === "admin";
    const isMember = user && (user.role === "member" || isAdmin || isAuthor);

    if (post.visibility === "draft" && !isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You cannot reply on this draft.",
      });
    }

    if (post.visibility === "private" && !isMember) {
      return res.status(403).json({
        success: false,
        message: "This is a members-only story. Please join to reply.",
      });
    }

    // Check if comments/replies are allowed
    if (post.allowComments === false) {
      return res.status(403).json({
        success: false,
        message: "Comments are disabled for this story",
      });
    }

    const reply = new Reply({
      commentId,
      postId: comment.postId,
      userId: req.userId,
      username: req.user.username,
      content,
    });

    await reply.save();

    // Increment reply count on comment
    comment.replyCount += 1;
    await comment.save();

    // Increment comment count on post
    if (post) {
      post.commentCount += 1;
      await post.save();
    }

    res.status(201).json({
      success: true,
      message: "Reply created successfully",
      reply,
    });
  } catch (error) {
    console.error("Create reply error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating reply",
      error: error.message,
    });
  }
};

// Update reply
const updateReply = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const reply = await Reply.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!reply) {
      return res.status(404).json({
        success: false,
        message: "Reply not found",
      });
    }

    // Check ownership
    if (!reply.canEdit(req.userId)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to edit this reply",
      });
    }

    reply.content = content;
    await reply.save();

    res.json({
      success: true,
      message: "Reply updated successfully",
      reply,
    });
  } catch (error) {
    console.error("Update reply error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating reply",
      error: error.message,
    });
  }
};

// Delete reply (soft delete)
const deleteReply = async (req, res) => {
  try {
    const { id } = req.params;

    const reply = await Reply.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!reply) {
      return res.status(404).json({
        success: false,
        message: "Reply not found",
      });
    }

    // Check ownership
    if (!reply.canDelete(req.userId)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this reply",
      });
    }

    reply.isDeleted = true;
    await reply.save();

    // Decrement reply count on comment
    const comment = await Comment.findById(reply.commentId);
    if (comment) {
      comment.replyCount = Math.max(0, comment.replyCount - 1);
      await comment.save();
    }

    // Decrement comment count on post
    const post = await Post.findById(reply.postId);
    if (post) {
      post.commentCount = Math.max(0, post.commentCount - 1);
      await post.save();
    }

    res.json({
      success: true,
      message: "Reply deleted successfully",
    });
  } catch (error) {
    console.error("Delete reply error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting reply",
      error: error.message,
    });
  }
};

module.exports = {
  getRepliesByComment,
  createReply,
  updateReply,
  deleteReply,
};
