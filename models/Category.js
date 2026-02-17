const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      maxlength: [200, "Description cannot exceed 200 characters"],
    },
    color: {
      type: String,
      default: "#1a8917", // Default Medium-like green
    },
  },
  {
    timestamps: true,
  },
);

// Auto-generate slug before validation
categorySchema.pre("validate", function () {
  if (this.name && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .split(" ")
      .join("-")
      .replace(/[^\w-]+/g, "");
  }
});

module.exports = mongoose.model("Category", categorySchema);
