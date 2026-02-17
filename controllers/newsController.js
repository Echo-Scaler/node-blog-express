const axios = require("axios");

// In-memory cache to stay within free tier limits
// Key: "category_page", Value: { data, timestamp, totalResults }
const cache = new Map();

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const CACHE_LIMIT = 20; // Maximum number of cached keys to prevent memory leaks

const getNews = async (req, res) => {
  try {
    let { category, q, page = 1, limit = 9 } = req.query;
    limit = parseInt(limit);
    const apiKey = process.env.NEWS_API_KEY;

    // Default to "general" if no category or "all" provided
    if (!category || category === "all" || category === "") {
      category = "general";
    }

    // Check cache (per category, query, and page)
    const cacheKey = `${category}_${q || "noquery"}_${page}_${limit}`;
    const now = Date.now();
    const cachedEntry = cache.get(cacheKey);

    if (cachedEntry && now - cachedEntry.timestamp < CACHE_DURATION) {
      console.log("Serving news from cache:", cacheKey);
      return res.json({
        success: true,
        source: "cache",
        articles: cachedEntry.data,
        pagination: {
          page: parseInt(page),
          limit: limit,
          total: cachedEntry.totalResults,
          pages: Math.ceil(cachedEntry.totalResults / limit),
        },
      });
    }

    if (!apiKey) {
      // Mock data if no API key is provided
      const mockArticles = [
        {
          title: "Welcome to Byte & Beyond News",
          description:
            "This is a placeholder for real news. Integrate NewsAPI.org or NewsData.io to see live international and IT stories here. Please add NEWS_API_KEY to your .env file.",
          url: "https://newsapi.org",
          urlToImage: null,
          publishedAt: new Date().toISOString(),
          source: { name: "System" },
        },
      ];

      return res.json({
        success: true,
        source: "mock",
        articles: mockArticles,
        pagination: { page: 1, limit: limit, total: 1, pages: 1 },
      });
    }

    // Default to NewsAPI.org
    const endpoint = q
      ? "https://newsapi.org/v2/everything"
      : "https://newsapi.org/v2/top-headlines";

    const params = {
      apiKey: apiKey,
      language: "en",
      page: page,
      pageSize: limit,
    };

    if (q) {
      params.q = q;
      // 'everything' endpoint allows sorting
      params.sortBy = "publishedAt";
    } else {
      params.category = category;
    }

    const response = await axios.get(endpoint, {
      params: params,
    });

    const articles = response.data.articles.map((article) => ({
      title: article.title,
      description:
        article.description || article.content || "No description available.",
      url: article.url,
      urlToImage: article.urlToImage,
      publishedAt: article.publishedAt,
      source: article.source.name,
    }));

    // Update cache
    if (cache.size >= CACHE_LIMIT) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }

    cache.set(cacheKey, {
      data: articles,
      timestamp: now,
      totalResults: response.data.totalResults,
    });

    res.json({
      success: true,
      source: "api",
      articles,
      pagination: {
        page: parseInt(page),
        limit: limit,
        total: response.data.totalResults,
        pages: Math.ceil(response.data.totalResults / limit),
      },
    });
  } catch (error) {
    console.error(
      "News fetch error:",
      error.response ? error.response.data : error.message,
    );
    res.status(500).json({
      success: false,
      message: "Error fetching news",
      error: error.message,
    });
  }
};

module.exports = {
  getNews,
};
