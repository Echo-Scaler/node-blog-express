const express = require("express");
const router = express.Router();
const newsController = require("../controllers/newsController");

// Get news articles
router.get("/", newsController.getNews);

module.exports = router;
