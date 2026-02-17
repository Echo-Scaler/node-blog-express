const Category = require("../models/Category");

// Get all categories
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching categories",
      error: error.message,
    });
  }
};

// Create a category (Admin only conceptually, but for now open)
const createCategory = async (req, res) => {
  try {
    const { name, description, color } = req.body;
    const category = new Category({ name, description, color });
    await category.save();
    res.status(201).json({
      success: true,
      category,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error creating category",
      error: error.message,
    });
  }
};

module.exports = {
  getCategories,
  createCategory,
};
