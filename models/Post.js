const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    excerpt: {
      type: String,
      maxlength: [300, "Excerpt cannot exceed 300 characters"],
    },
    status: {
      type: String,
      enum: ["published", "draft", "hidden"],
      default: "published",
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    viewCount: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
    reactionCount: {
      type: Number,
      default: 0,
    },
    shareCount: {
      type: Number,
      default: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for performance
postSchema.index({ userId: 1 });
postSchema.index({ status: 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ tags: 1 });

// Method to check if user can edit this post
postSchema.methods.canEdit = function (userId) {
  return this.userId.toString() === userId.toString();
};

// Method to check if user can delete this post
postSchema.methods.canDelete = function (userId) {
  return this.userId.toString() === userId.toString();
};

// Method to toggle visibility
postSchema.methods.toggleVisibility = function () {
  if (this.status === "published") {
    this.status = "hidden";
  } else if (this.status === "hidden") {
    this.status = "published";
  }
  return this.save();
};

// Auto-generate excerpt from content if not provided
postSchema.pre("save", async function () {
  if (!this.excerpt && this.content) {
    this.excerpt = this.content.substring(0, 150) + "...";
  }
});

module.exports = mongoose.model("Post", postSchema);
