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
    slug: {
      type: String,
      unique: true,
      trim: true,
      index: true,
    },
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    excerpt: {
      type: String,
      maxlength: [300, "Excerpt cannot exceed 300 characters"],
    },
    subtitle: {
      type: String,
      maxlength: [255, "Subtitle cannot exceed 255 characters"],
    },
    visibility: {
      type: String,
      enum: ["public", "draft", "private"],
      default: "draft",
      index: true,
    },
    scheduledAt: {
      type: Date,
      index: true,
    },
    publishedAt: {
      type: Date,
      index: true,
    },
    metaTitle: {
      type: String,
      maxlength: [120, "Meta title cannot exceed 120 characters"],
    },
    metaDescription: {
      type: String,
      maxlength: [160, "Meta description cannot exceed 160 characters"],
    },
    ogImage: {
      type: String,
    },
    readTimeMins: {
      type: Number,
      default: 1,
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
    image: {
      type: String,
      default: "",
    },
    featured: {
      type: Boolean,
      default: false,
    },
    allowComments: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for performance
postSchema.index({ userId: 1 });
postSchema.index({ visibility: 1 });
postSchema.index({ publishedAt: -1 });
postSchema.index({ scheduledAt: 1 });
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
  if (this.visibility === "public") {
    this.visibility = "draft";
    this.publishedAt = null;
  } else {
    this.visibility = "public";
    this.publishedAt = new Date();
  }
  return this.save();
};

// Auto-generate excerpt from content if not provided
postSchema.pre("save", async function () {
  if (!this.excerpt && this.content) {
    this.excerpt = this.content.substring(0, 150) + "...";
  }
});

// Auto-generate slug if not provided (simple version for seeding/testing)
postSchema.pre("validate", async function () {
  if (this.title && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 100);

    // Basic uniqueness (append random string if likely collision in seed)
    // For proper app usage, the controller handles thorough uniqueness checks.
    // This is a fallback.
  }
});

module.exports = mongoose.model("Post", postSchema);
