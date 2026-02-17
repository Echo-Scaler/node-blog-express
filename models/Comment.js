const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: [true, "Comment content is required"],
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
    },
    replyCount: {
      type: Number,
      default: 0,
    },
    reactionCount: {
      type: Number,
      default: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for performance
commentSchema.index({ postId: 1, createdAt: -1 });
commentSchema.index({ userId: 1 });

// Method to check if user can edit this comment
commentSchema.methods.canEdit = function (userId) {
  return this.userId.toString() === userId.toString();
};

// Method to check if user can delete this comment
commentSchema.methods.canDelete = function (userId) {
  return this.userId.toString() === userId.toString();
};

module.exports = mongoose.model("Comment", commentSchema);
