const Reaction = require("../models/Reaction");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Reply = require("../models/Reply");

// Add or toggle reaction
const addReaction = async (req, res) => {
  try {
    const { targetType, targetId, reactionType } = req.body;

    // Find the target to get owner ID
    let target;
    let targetOwnerId;

    switch (targetType) {
      case "post":
        target = await Post.findOne({ _id: targetId, isDeleted: false });
        if (!target) {
          return res.status(404).json({
            success: false,
            message: "Post not found",
          });
        }
        targetOwnerId = target.userId;
        break;

      case "comment":
        target = await Comment.findOne({ _id: targetId, isDeleted: false });
        if (!target) {
          return res.status(404).json({
            success: false,
            message: "Comment not found",
          });
        }
        targetOwnerId = target.userId;
        break;

      case "reply":
        target = await Reply.findOne({ _id: targetId, isDeleted: false });
        if (!target) {
          return res.status(404).json({
            success: false,
            message: "Reply not found",
          });
        }
        targetOwnerId = target.userId;
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid target type",
        });
    }

    // Toggle reaction (validates no self-reaction)
    const result = await Reaction.toggleReaction(
      req.userId,
      targetType,
      targetId,
      targetOwnerId,
      reactionType || "like",
    );

    // Update reaction count on target
    if (result.action === "added") {
      target.reactionCount += 1;
    } else if (result.action === "removed") {
      target.reactionCount = Math.max(0, target.reactionCount - 1);
    }
    await target.save();

    res.json({
      success: true,
      message: `Reaction ${result.action}`,
      action: result.action,
      reaction: result.reaction,
    });
  } catch (error) {
    if (error.message === "You cannot react to your own content") {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Add reaction error:", error);
    res.status(500).json({
      success: false,
      message: "Error adding reaction",
      error: error.message,
    });
  }
};

// Remove reaction
const removeReaction = async (req, res) => {
  try {
    const { id } = req.params;

    const reaction = await Reaction.findById(id);

    if (!reaction) {
      return res.status(404).json({
        success: false,
        message: "Reaction not found",
      });
    }

    // Check ownership
    if (reaction.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only remove your own reactions",
      });
    }

    // Find target and decrement count
    let target;
    switch (reaction.targetType) {
      case "post":
        target = await Post.findById(reaction.targetId);
        break;
      case "comment":
        target = await Comment.findById(reaction.targetId);
        break;
      case "reply":
        target = await Reply.findById(reaction.targetId);
        break;
    }

    if (target) {
      target.reactionCount = Math.max(0, target.reactionCount - 1);
      await target.save();
    }

    await reaction.deleteOne();

    res.json({
      success: true,
      message: "Reaction removed successfully",
    });
  } catch (error) {
    console.error("Remove reaction error:", error);
    res.status(500).json({
      success: false,
      message: "Error removing reaction",
      error: error.message,
    });
  }
};

// Get reactions for a target
const getReactions = async (req, res) => {
  try {
    const { targetType, targetId } = req.params;

    const reactions = await Reaction.find({
      targetType,
      targetId,
    })
      .populate("userId", "username displayName avatar")
      .sort({ createdAt: -1 });

    // Group by reaction type
    const grouped = reactions.reduce((acc, reaction) => {
      const type = reaction.reactionType;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(reaction);
      return acc;
    }, {});

    res.json({
      success: true,
      reactions,
      grouped,
      total: reactions.length,
    });
  } catch (error) {
    console.error("Get reactions error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching reactions",
      error: error.message,
    });
  }
};

module.exports = {
  addReaction,
  removeReaction,
  getReactions,
};
