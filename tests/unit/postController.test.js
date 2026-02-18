const Post = require("../../models/Post");
const {
  getAllPosts,
  getPostById,
  createPost,
  deletePost,
  hidePost,
  getRelatedPosts,
} = require("../../controllers/postController");
const httpMocks = require("node-mocks-http");

jest.mock("../../models/Post");

describe("Post Controller", () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  // ── getAllPosts ────────────────────────────────────────────
  describe("getAllPosts", () => {
    it("should return 200 and all posts", async () => {
      const mockPosts = [
        { title: "Post 1", content: "Content 1" },
        { title: "Post 2", content: "Content 2" },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
      };
      mockQuery.then = (resolve) => resolve(mockPosts);

      Post.find.mockReturnValue(mockQuery);
      Post.countDocuments.mockResolvedValue(2);

      await getAllPosts(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toEqual({
        success: true,
        posts: mockPosts,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1,
        },
      });
    });

    it("should handle pagination parameters", async () => {
      req.query = { page: "2", limit: "5" };

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
      };
      mockQuery.then = (resolve) => resolve([]);

      Post.find.mockReturnValue(mockQuery);
      Post.countDocuments.mockResolvedValue(0);

      await getAllPosts(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockQuery.skip).toHaveBeenCalledWith(5); // (2-1) * 5
      expect(mockQuery.limit).toHaveBeenCalledWith(5);
    });

    it("should handle errors", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const errorMessage = new Error("Error finding posts");
      Post.find.mockImplementation(() => {
        throw errorMessage;
      });

      await getAllPosts(req, res);

      expect(res.statusCode).toBe(500);
      expect(res._getJSONData()).toEqual({
        success: false,
        message: "Error fetching posts",
        error: expect.anything(),
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Get all posts error:",
        errorMessage,
      );

      consoleSpy.mockRestore();
    });
  });

  // ── getPostById ───────────────────────────────────────────
  describe("getPostById", () => {
    it("should return a published post", async () => {
      req.params = { id: "post123" };

      const mockPost = {
        _id: "post123",
        title: "Test Post",
        status: "published",
        viewCount: 10,
        userId: { toString: () => "owner1" },
        save: jest.fn().mockResolvedValue(true),
      };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
      };
      mockQuery.populate.mockReturnValueOnce(mockQuery);
      mockQuery.populate.mockReturnValueOnce({
        then: (resolve) => resolve(mockPost),
      });

      Post.findOne.mockReturnValue(mockQuery);

      await getPostById(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.success).toBe(true);
      expect(mockPost.viewCount).toBe(11);
    });

    it("should return 404 if post not found", async () => {
      req.params = { id: "nonexistent" };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
      };
      mockQuery.populate.mockReturnValueOnce(mockQuery);
      mockQuery.populate.mockReturnValueOnce({
        then: (resolve) => resolve(null),
      });

      Post.findOne.mockReturnValue(mockQuery);

      await getPostById(req, res);

      expect(res.statusCode).toBe(404);
    });

    it("should return 403 for draft posts viewed by non-owner", async () => {
      req.params = { id: "post123" };
      req.userId = "otheruser";

      const mockPost = {
        _id: "post123",
        status: "draft",
        userId: { toString: () => "owner1" },
      };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
      };
      mockQuery.populate.mockReturnValueOnce(mockQuery);
      mockQuery.populate.mockReturnValueOnce({
        then: (resolve) => resolve(mockPost),
      });

      Post.findOne.mockReturnValue(mockQuery);

      await getPostById(req, res);

      expect(res.statusCode).toBe(403);
    });
  });

  // ── createPost ────────────────────────────────────────────
  describe("createPost", () => {
    it("should create a post and return 201", async () => {
      req.body = {
        title: "New Post",
        content: "Content here",
        excerpt: "Excerpt",
        status: "published",
        tags: ["javascript", "nodejs"],
        categoryId: "cat1",
      };
      req.userId = "user123";
      req.user = { username: "testuser" };

      const mockPost = {
        _id: "newpost123",
        title: "New Post",
        save: jest.fn().mockResolvedValue(true),
      };
      Post.mockImplementation(() => mockPost);

      await createPost(req, res);

      expect(res.statusCode).toBe(201);
      const data = res._getJSONData();
      expect(data.success).toBe(true);
      expect(data.message).toMatch(/created/);
    });

    it("should handle file upload for cover image", async () => {
      req.body = { title: "Post with Image", content: "Content" };
      req.userId = "user123";
      req.user = { username: "testuser" };
      req.file = { filename: "cover123.jpg" };

      const mockPost = {
        save: jest.fn().mockResolvedValue(true),
      };
      Post.mockImplementation((data) => {
        Object.assign(mockPost, data);
        return mockPost;
      });

      await createPost(req, res);

      expect(res.statusCode).toBe(201);
    });

    it("should return 500 on server error", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      req.body = { title: "Post", content: "Content" };
      req.userId = "user123";
      req.user = { username: "testuser" };

      Post.mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(new Error("DB error")),
      }));

      await createPost(req, res);

      expect(res.statusCode).toBe(500);
      consoleSpy.mockRestore();
    });
  });

  // ── deletePost ────────────────────────────────────────────
  describe("deletePost", () => {
    it("should soft delete a post", async () => {
      req.params = { id: "post123" };
      req.userId = "user123";

      const mockPost = {
        _id: "post123",
        isDeleted: false,
        canDelete: jest.fn().mockReturnValue(true),
        save: jest.fn().mockResolvedValue(true),
      };
      Post.findOne.mockResolvedValue(mockPost);

      await deletePost(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockPost.isDeleted).toBe(true);
      expect(res._getJSONData().message).toMatch(/deleted/);
    });

    it("should return 404 if post not found", async () => {
      req.params = { id: "nonexistent" };
      Post.findOne.mockResolvedValue(null);

      await deletePost(req, res);

      expect(res.statusCode).toBe(404);
    });

    it("should return 403 if user lacks permission", async () => {
      req.params = { id: "post123" };
      req.userId = "otheruser";

      const mockPost = {
        canDelete: jest.fn().mockReturnValue(false),
      };
      Post.findOne.mockResolvedValue(mockPost);

      await deletePost(req, res);

      expect(res.statusCode).toBe(403);
    });
  });

  // ── hidePost ──────────────────────────────────────────────
  describe("hidePost", () => {
    it("should toggle post visibility", async () => {
      req.params = { id: "post123" };
      req.userId = "user123";

      const mockPost = {
        _id: "post123",
        status: "hidden",
        canEdit: jest.fn().mockReturnValue(true),
        toggleVisibility: jest.fn().mockResolvedValue(true),
      };
      Post.findOne.mockResolvedValue(mockPost);

      await hidePost(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockPost.toggleVisibility).toHaveBeenCalled();
    });

    it("should return 404 if post not found", async () => {
      req.params = { id: "nonexistent" };
      Post.findOne.mockResolvedValue(null);

      await hidePost(req, res);

      expect(res.statusCode).toBe(404);
    });

    it("should return 403 if user cannot edit", async () => {
      req.params = { id: "post123" };
      req.userId = "otheruser";

      const mockPost = {
        canEdit: jest.fn().mockReturnValue(false),
      };
      Post.findOne.mockResolvedValue(mockPost);

      await hidePost(req, res);

      expect(res.statusCode).toBe(403);
    });
  });

  // ── getRelatedPosts ───────────────────────────────────────
  describe("getRelatedPosts", () => {
    it("should return related posts in same category", async () => {
      req.params = { id: "post123" };

      const mockPost = {
        _id: "post123",
        categoryId: "cat1",
      };
      Post.findOne.mockResolvedValue(mockPost);

      const mockRelated = [{ title: "Related 1" }, { title: "Related 2" }];
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
      };
      mockQuery.then = (resolve) => resolve(mockRelated);

      Post.find.mockReturnValue(mockQuery);

      await getRelatedPosts(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.posts).toHaveLength(2);
    });

    it("should return 404 if source post not found", async () => {
      req.params = { id: "nonexistent" };
      Post.findOne.mockResolvedValue(null);

      await getRelatedPosts(req, res);

      expect(res.statusCode).toBe(404);
    });
  });
});
