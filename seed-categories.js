const mongoose = require("mongoose");
const Category = require("./models/Category");
require("dotenv").config();

const seedCategories = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB for seeding...");

    // Clear existing categories to avoid index issues with 'slug: null'
    console.log("Clearing existing categories...");
    await Category.deleteMany({});

    const categories = [
      {
        name: "Technology",
        slug: "technology",
        description: "All things tech, coding, and gadgets",
        color: "#6200ee",
      },
      {
        name: "Design",
        slug: "design",
        description: "UI/UX, graphic design, and aesthetics",
        color: "#03dac6",
      },
      {
        name: "Lifestyle",
        slug: "lifestyle",
        description: "Health, travel, and daily life",
        color: "#ff0266",
      },
      {
        name: "Business",
        slug: "business",
        description: "Startup, finance, and marketing",
        color: "#018786",
      },
      {
        name: "Science",
        slug: "science",
        description: "Space, biology, and research",
        color: "#3700b3",
      },
    ];

    console.log("Seeding categories...");
    await Category.insertMany(categories);

    console.log("Categories seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding categories:", error);
    process.exit(1);
  }
};

seedCategories();
