const mongoose = require("mongoose");

const replySchema = new mongoose.Schema(
  {
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      required: true,
    },
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
      required: [true, "Reply content is required"],
      maxlength: [1000, "Reply cannot exceed 1000 characters"],
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
replySchema.index({ commentId: 1, createdAt: -1 });
replySchema.index({ postId: 1 });
replySchema.index({ userId: 1 });

// Method to check if user can edit this reply
replySchema.methods.canEdit = function (userId) {
  return this.userId.toString() === userId.toString();
};

// Method to check if user can delete this reply
replySchema.methods.canDelete = function (userId) {
  return this.userId.toString() === userId.toString();
};

module.exports = mongoose.model("Reply", replySchema);
