const mongoose = require("mongoose");

const reactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetType: {
      type: String,
      enum: ["post", "comment", "reply"],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    targetOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reactionType: {
      type: String,
      enum: ["like", "love", "insightful", "funny"],
      default: "like",
    },
  },
  {
    timestamps: true,
  },
);

// Compound unique index to prevent duplicate reactions
reactionSchema.index(
  { userId: 1, targetType: 1, targetId: 1 },
  { unique: true },
);

// Indexes for queries
reactionSchema.index({ targetType: 1, targetId: 1 });
reactionSchema.index({ userId: 1, targetOwnerId: 1 });

// Static method to validate reaction (prevent self-reactions)
reactionSchema.statics.validateReaction = async function (
  userId,
  targetOwnerId,
) {
  if (userId.toString() === targetOwnerId.toString()) {
    throw new Error("You cannot react to your own content");
  }
  return true;
};

// Static method to toggle reaction
reactionSchema.statics.toggleReaction = async function (
  userId,
  targetType,
  targetId,
  targetOwnerId,
  reactionType = "like",
) {
  // Validate no self-reaction
  await this.validateReaction(userId, targetOwnerId);

  // Check if reaction already exists
  const existingReaction = await this.findOne({
    userId,
    targetType,
    targetId,
  });

  if (existingReaction) {
    // If same type, remove it (toggle off)
    if (existingReaction.reactionType === reactionType) {
      await existingReaction.deleteOne();
      return { action: "removed", reaction: null };
    } else {
      // If different type, update it
      existingReaction.reactionType = reactionType;
      await existingReaction.save();
      return { action: "updated", reaction: existingReaction };
    }
  } else {
    // Create new reaction
    const newReaction = await this.create({
      userId,
      targetType,
      targetId,
      targetOwnerId,
      reactionType,
    });
    return { action: "added", reaction: newReaction };
  }
};

module.exports = mongoose.model("Reaction", reactionSchema);
