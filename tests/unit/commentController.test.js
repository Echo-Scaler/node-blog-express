const httpMocks = require("node-mocks-http");
const Comment = require("../../models/Comment");
const Post = require("../../models/Post");
const {
  createComment,
  updateComment,
  deleteComment,
} = require("../../controllers/commentController");

jest.mock("../../models/Comment");
jest.mock("../../models/Post");

describe("Comment Controller", () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  // ── createComment ─────────────────────────────────────────
  describe("createComment", () => {
    it("should create a comment and return 201", async () => {
      req.params = { postId: "post123" };
      req.body = { content: "Great post!" };
      req.userId = "user123";
      req.user = { _id: "user123", username: "testuser" };

      const mockPost = {
        _id: "post123",
        userId: "user456", // Post author
        visibility: "public",
        allowComments: true,
        commentCount: 5,
        save: jest.fn().mockResolvedValue(true),
      };
      Post.findById.mockResolvedValue(mockPost);

      const mockComment = {
        _id: "comment123",
        postId: "post123",
        userId: "user123",
        content: "Great post!",
        save: jest.fn().mockResolvedValue(true),
      };
      Comment.mockImplementation(() => mockComment);

      await createComment(req, res);

      expect(res.statusCode).toBe(201);
      const data = res._getJSONData();
      expect(data.success).toBe(true);
      expect(data.comment.content).toBe("Great post!");
      expect(mockPost.commentCount).toBe(6);
      expect(mockPost.save).toHaveBeenCalled();
    });

    it("should return 404 if post not found", async () => {
      req.params = { postId: "nonexistent" };
      req.body = { content: "Comment" };
      Post.findById.mockResolvedValue(null);

      await createComment(req, res);

      expect(res.statusCode).toBe(404);
      expect(res._getJSONData().message).toMatch(/Post not found/);
    });

    it("should return 500 on server error", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      req.params = { postId: "post123" };
      req.body = { content: "Comment" };
      // Add userId and user mock as the controller might access them before Post.findById
      req.userId = "user123";
      req.user = { _id: "user123", username: "testuser" };
      Post.findById.mockRejectedValue(new Error("DB error"));

      await createComment(req, res);

      expect(res.statusCode).toBe(500);
      expect(res._getJSONData().message).toMatch(/Error creating comment/);
      consoleSpy.mockRestore();
    });
  });

  // ── updateComment ─────────────────────────────────────────
  describe("updateComment", () => {
    it("should update a comment successfully", async () => {
      req.params = { id: "comment123" };
      req.body = { content: "Updated content" };
      req.userId = "user123";

      const mockComment = {
        _id: "comment123",
        content: "Old content",
        canEdit: jest.fn().mockReturnValue(true),
        save: jest.fn().mockResolvedValue(true),
      };
      Comment.findOne.mockResolvedValue(mockComment);

      await updateComment(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockComment.content).toBe("Updated content");
      expect(mockComment.save).toHaveBeenCalled();
    });

    it("should return 404 if comment not found", async () => {
      req.params = { id: "nonexistent" };
      req.body = { content: "Updated" };
      Comment.findOne.mockResolvedValue(null);

      await updateComment(req, res);

      expect(res.statusCode).toBe(404);
    });

    it("should return 403 if user does not own the comment", async () => {
      req.params = { id: "comment123" };
      req.body = { content: "Updated" };
      req.userId = "otheruser";

      const mockComment = {
        _id: "comment123",
        canEdit: jest.fn().mockReturnValue(false),
      };
      Comment.findOne.mockResolvedValue(mockComment);

      await updateComment(req, res);

      expect(res.statusCode).toBe(403);
      expect(res._getJSONData().message).toMatch(/permission/);
    });
  });

  // ── deleteComment ─────────────────────────────────────────
  describe("deleteComment", () => {
    it("should soft delete a comment and decrement post count", async () => {
      req.params = { id: "comment123" };
      req.userId = "user123";

      const mockComment = {
        _id: "comment123",
        postId: "post123",
        isDeleted: false,
        canDelete: jest.fn().mockReturnValue(true),
        save: jest.fn().mockResolvedValue(true),
      };
      Comment.findOne.mockResolvedValue(mockComment);

      const mockPost = {
        _id: "post123",
        commentCount: 5,
        save: jest.fn().mockResolvedValue(true),
      };
      Post.findById.mockResolvedValue(mockPost);

      await deleteComment(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockComment.isDeleted).toBe(true);
      expect(mockPost.commentCount).toBe(4);
    });

    it("should return 404 if comment not found", async () => {
      req.params = { id: "nonexistent" };
      Comment.findOne.mockResolvedValue(null);

      await deleteComment(req, res);

      expect(res.statusCode).toBe(404);
    });

    it("should return 403 if user lacks permission", async () => {
      req.params = { id: "comment123" };
      req.userId = "otheruser";

      const mockComment = {
        _id: "comment123",
        canDelete: jest.fn().mockReturnValue(false),
      };
      Comment.findOne.mockResolvedValue(mockComment);

      await deleteComment(req, res);

      expect(res.statusCode).toBe(403);
    });

    it("should handle commentCount not going below 0", async () => {
      req.params = { id: "comment123" };
      req.userId = "user123";

      const mockComment = {
        _id: "comment123",
        postId: "post123",
        isDeleted: false,
        canDelete: jest.fn().mockReturnValue(true),
        save: jest.fn().mockResolvedValue(true),
      };
      Comment.findOne.mockResolvedValue(mockComment);

      const mockPost = {
        commentCount: 0,
        save: jest.fn().mockResolvedValue(true),
      };
      Post.findById.mockResolvedValue(mockPost);

      await deleteComment(req, res);

      expect(mockPost.commentCount).toBe(0);
    });
  });
});
