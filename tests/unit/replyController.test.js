const httpMocks = require("node-mocks-http");
const Reply = require("../../models/Reply");
const Comment = require("../../models/Comment");
const {
  createReply,
  updateReply,
  deleteReply,
} = require("../../controllers/replyController");

jest.mock("../../models/Reply");
jest.mock("../../models/Comment");
jest.mock("../../models/Post");

describe("Reply Controller", () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  // ── createReply ───────────────────────────────────────────
  describe("createReply", () => {
    it("should create a reply and return 201", async () => {
      req.params = { commentId: "comment123" };
      req.body = { content: "Nice comment!" };
      req.userId = "user123";
      req.user = { username: "testuser" };

      const mockComment = {
        _id: "comment123",
        postId: "post123",
        replyCount: 2,
        save: jest.fn().mockResolvedValue(true),
      };
      Comment.findOne.mockResolvedValue(mockComment);

      const mockReply = {
        _id: "reply123",
        commentId: "comment123",
        content: "Nice comment!",
        save: jest.fn().mockResolvedValue(true),
      };
      Reply.mockImplementation(() => mockReply);

      // Mock Post.findById used inside createReply
      const Post = require("../../models/Post");
      const mockPost = {
        _id: "post123",
        commentCount: 10,
        save: jest.fn().mockResolvedValue(true),
      };
      Post.findById.mockResolvedValue(mockPost);

      await createReply(req, res);

      expect(res.statusCode).toBe(201);
      const data = res._getJSONData();
      expect(data.success).toBe(true);
      expect(mockComment.replyCount).toBe(3);
      expect(mockPost.commentCount).toBe(11);
    });

    it("should return 404 if comment not found", async () => {
      req.params = { commentId: "nonexistent" };
      req.body = { content: "Reply" };
      Comment.findOne.mockResolvedValue(null);

      await createReply(req, res);

      expect(res.statusCode).toBe(404);
      expect(res._getJSONData().message).toMatch(/Comment not found/);
    });

    it("should return 500 on server error", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      req.params = { commentId: "c1" };
      req.body = { content: "Reply" };
      Comment.findOne.mockRejectedValue(new Error("DB error"));

      await createReply(req, res);

      expect(res.statusCode).toBe(500);
      consoleSpy.mockRestore();
    });
  });

  // ── updateReply ───────────────────────────────────────────
  describe("updateReply", () => {
    it("should update a reply successfully", async () => {
      req.params = { id: "reply123" };
      req.body = { content: "Updated reply" };
      req.userId = "user123";

      const mockReply = {
        _id: "reply123",
        content: "Old reply",
        canEdit: jest.fn().mockReturnValue(true),
        save: jest.fn().mockResolvedValue(true),
      };
      Reply.findOne.mockResolvedValue(mockReply);

      await updateReply(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockReply.content).toBe("Updated reply");
    });

    it("should return 404 if reply not found", async () => {
      req.params = { id: "nonexistent" };
      req.body = { content: "Updated" };
      Reply.findOne.mockResolvedValue(null);

      await updateReply(req, res);

      expect(res.statusCode).toBe(404);
    });

    it("should return 403 if user cannot edit reply", async () => {
      req.params = { id: "reply123" };
      req.body = { content: "Updated" };
      req.userId = "otheruser";

      const mockReply = {
        _id: "reply123",
        canEdit: jest.fn().mockReturnValue(false),
      };
      Reply.findOne.mockResolvedValue(mockReply);

      await updateReply(req, res);

      expect(res.statusCode).toBe(403);
    });
  });

  // ── deleteReply ───────────────────────────────────────────
  describe("deleteReply", () => {
    it("should soft delete a reply and decrement counts", async () => {
      req.params = { id: "reply123" };
      req.userId = "user123";

      const mockReply = {
        _id: "reply123",
        commentId: "comment123",
        postId: "post123",
        isDeleted: false,
        canDelete: jest.fn().mockReturnValue(true),
        save: jest.fn().mockResolvedValue(true),
      };
      Reply.findOne.mockResolvedValue(mockReply);

      const mockComment = {
        replyCount: 3,
        save: jest.fn().mockResolvedValue(true),
      };
      Comment.findById.mockResolvedValue(mockComment);

      const Post = require("../../models/Post");
      const mockPost = {
        commentCount: 10,
        save: jest.fn().mockResolvedValue(true),
      };
      Post.findById.mockResolvedValue(mockPost);

      await deleteReply(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockReply.isDeleted).toBe(true);
      expect(mockComment.replyCount).toBe(2);
      expect(mockPost.commentCount).toBe(9);
    });

    it("should return 404 if reply not found", async () => {
      req.params = { id: "nonexistent" };
      Reply.findOne.mockResolvedValue(null);

      await deleteReply(req, res);

      expect(res.statusCode).toBe(404);
    });

    it("should return 403 if user lacks permission to delete", async () => {
      req.params = { id: "reply123" };
      req.userId = "otheruser";

      const mockReply = {
        _id: "reply123",
        canDelete: jest.fn().mockReturnValue(false),
      };
      Reply.findOne.mockResolvedValue(mockReply);

      await deleteReply(req, res);

      expect(res.statusCode).toBe(403);
    });

    it("should handle replyCount not going below 0", async () => {
      req.params = { id: "reply123" };
      req.userId = "user123";

      const mockReply = {
        _id: "reply123",
        commentId: "comment123",
        postId: "post123",
        isDeleted: false,
        canDelete: jest.fn().mockReturnValue(true),
        save: jest.fn().mockResolvedValue(true),
      };
      Reply.findOne.mockResolvedValue(mockReply);

      const mockComment = {
        replyCount: 0,
        save: jest.fn().mockResolvedValue(true),
      };
      Comment.findById.mockResolvedValue(mockComment);

      const Post = require("../../models/Post");
      const mockPost = {
        commentCount: 0,
        save: jest.fn().mockResolvedValue(true),
      };
      Post.findById.mockResolvedValue(mockPost);

      await deleteReply(req, res);

      expect(mockComment.replyCount).toBe(0);
      expect(mockPost.commentCount).toBe(0);
    });
  });
});
