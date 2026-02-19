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
        target = await Post.findById(targetId);
        if (!target || target.isDeleted) {
          return res.status(404).json({
            success: false,
            message: "Post not found",
          });
        }

        // Access Control for reactions
        const user = req.user;
        const isAuthor =
          user && target.userId.toString() === user._id.toString();
        const isAdmin = user && user.role === "admin";
        const isMember =
          user && (user.role === "member" || isAdmin || isAuthor);

        if (target.visibility === "draft" && !isAuthor && !isAdmin) {
          return res.status(403).json({
            success: false,
            message: "You cannot react to this draft.",
          });
        }

        if (target.visibility === "private" && !isMember) {
          return res.status(403).json({
            success: false,
            message: "This is a members-only story. Please join to react.",
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

    // Validate no self-reaction (only for posts, comments/replies allowed like Facebook)
    if (targetType === "post") {
      await Reaction.validateReaction(req.userId, targetOwnerId);
    }

    // Toggle reaction
    const result = await Reaction.toggleReaction(
      req.userId,
      targetType,
      targetId,
      targetOwnerId,
      reactionType || "love",
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

// Get recent interactions (reactions and comments) on user's content
const getMyInteractions = async (req, res) => {
  try {
    const userId = req.userId;

    // 1. Get all post IDs by this user (to map titles)
    const posts = await Post.find({ userId }).select("_id title");
    const postMap = posts.reduce((acc, post) => {
      acc[post._id.toString()] = post.title;
      return acc;
    }, {});

    // 2. Fetch reactions where targetOwnerId is the current user
    // This covers reactions on Posts, Comments, and Replies owned by the user
    const reactions = await Reaction.find({
      targetOwnerId: userId,
      userId: { $ne: userId }, // Exclude self-reactions
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("userId", "username avatar")
      .lean();

    // 3. Fetch Comments on User's Posts
    const postIds = posts.map((p) => p._id);
    const commentsOnPosts = await Comment.find({
      postId: { $in: postIds },
      isDeleted: false,
      userId: { $ne: userId },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("userId", "username avatar")
      .lean();

    // 4. Fetch Replies to User's Comments
    // First find user's comments IDs
    const myComments = await Comment.find({ userId }).select("_id postId");
    const myCommentIds = myComments.map((c) => c._id);
    // Map commentId to PostId to get title
    const commentPostMap = myComments.reduce((acc, c) => {
      acc[c._id.toString()] = c.postId.toString();
      return acc;
    }, {});

    const repliesToMe = await Reply.find({
      commentId: { $in: myCommentIds },
      isDeleted: false,
      userId: { $ne: userId },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("userId", "username avatar")
      .lean();

    // Format Data
    const formattedReactions = reactions.map((r) => {
      let postTitle = "Content";
      let postId = r.targetId; // Default fallback

      if (r.targetType === "post") {
        postTitle = postMap[r.targetId.toString()] || "Post";
      } else if (r.targetType === "comment") {
        // For comments/replies, we might not have the post ID readily available in Reaction
        // But the user clicks to view the item.
        // If we want to link to the POST, we need lookups.
        // For now, let's link to the Post if possible.
        // If it's a reaction to a comment, we need to know the Post ID of that comment.
        // Ideally we would populate targetId -> postId but targetId is dynamic ref.
        // Simplified: Link to "View Story" if we have the Post ID map, else generic.
        // Note: Reaction on Comment doesn't store PostID.
        // However, we can leave generic "View Story" link or just link to the dashboard?
        // Let's rely on client handling or just providing the targetId.
        // *Correction*: In the dashboard loop, we use /posts/${postId}.
        // If we don't have postId, the link will break.
        // We need to fetch Post ID for these targets.
        // This is expensive. Let's optimize:
        // For this iteration, we will leave postId as targetId if type is Post.
        // If type is Comment/Reply, we might miss the PostID.
        // BUT, for the Dashboard, the user wants "Show who reacted...".
        // Let's try to do a best effort.
        if (postMap[r.targetId.toString()]) {
          postId = r.targetId;
          postTitle = postMap[r.targetId.toString()];
        }
      }
      return {
        type: "reaction",
        subType: r.targetType === "post" ? "post_reaction" : "comment_reaction", // Distinguish
        reactionType: r.reactionType,
        user: r.userId,
        postTitle: postTitle,
        postId: postId, // Using targetId for now, client can handle redirection or just view
        createdAt: r.createdAt,
        content: "",
      };
    });

    const formattedComments = commentsOnPosts.map((c) => ({
      type: "comment",
      subType: "post_comment",
      user: c.userId,
      postTitle: postMap[c.postId.toString()] || "Story",
      postId: c.postId,
      createdAt: c.createdAt,
      content: c.content,
    }));

    const formattedReplies = repliesToMe.map((r) => {
      const pId = commentPostMap[r.commentId.toString()];
      return {
        type: "comment",
        subType: "reply",
        user: r.userId,
        postTitle: postMap[pId] || "Story", // Title of the post the comment is on
        postId: pId, // Link to the actual post
        createdAt: r.createdAt,
        content: r.content,
      };
    });

    // Merge and sort
    const interactions = [
      ...formattedReactions,
      ...formattedComments,
      ...formattedReplies,
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      activity: interactions.slice(0, 20),
    });
  } catch (error) {
    console.error("Get my interactions error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching interactions",
      error: error.message,
    });
  }
};

module.exports = {
  addReaction,
  removeReaction,
  getReactions,
  getMyInteractions,
};
