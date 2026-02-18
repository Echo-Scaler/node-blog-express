const httpMocks = require("node-mocks-http");
const Reaction = require("../../models/Reaction");
const Post = require("../../models/Post");
const Comment = require("../../models/Comment");
const Reply = require("../../models/Reply");
const {
  addReaction,
  removeReaction,
  getReactions,
} = require("../../controllers/reactionController");

jest.mock("../../models/Reaction");
jest.mock("../../models/Post");
jest.mock("../../models/Comment");
jest.mock("../../models/Reply");

describe("Reaction Controller", () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  // ── addReaction ───────────────────────────────────────────
  describe("addReaction", () => {
    it("should add a reaction to a post", async () => {
      req.body = {
        targetType: "post",
        targetId: "post123",
        reactionType: "love",
      };
      req.userId = "user456";

      const mockPost = {
        _id: "post123",
        userId: "owner789",
        reactionCount: 3,
        save: jest.fn().mockResolvedValue(true),
      };
      Post.findOne.mockResolvedValue(mockPost);
      Reaction.validateReaction = jest.fn().mockResolvedValue(true);
      Reaction.toggleReaction = jest.fn().mockResolvedValue({
        action: "added",
        reaction: { _id: "r1", reactionType: "love" },
      });

      await addReaction(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.success).toBe(true);
      expect(data.action).toBe("added");
      expect(mockPost.reactionCount).toBe(4);
    });

    it("should remove a toggled-off reaction", async () => {
      req.body = { targetType: "post", targetId: "post123" };
      req.userId = "user456";

      const mockPost = {
        _id: "post123",
        userId: "owner789",
        reactionCount: 3,
        save: jest.fn().mockResolvedValue(true),
      };
      Post.findOne.mockResolvedValue(mockPost);
      Reaction.validateReaction = jest.fn().mockResolvedValue(true);
      Reaction.toggleReaction = jest.fn().mockResolvedValue({
        action: "removed",
        reaction: null,
      });

      await addReaction(req, res);

      expect(mockPost.reactionCount).toBe(2);
    });

    it("should add a reaction to a comment", async () => {
      req.body = {
        targetType: "comment",
        targetId: "comment123",
        reactionType: "love",
      };
      req.userId = "user456";

      const mockComment = {
        _id: "comment123",
        userId: "owner789",
        reactionCount: 1,
        save: jest.fn().mockResolvedValue(true),
      };
      Comment.findOne.mockResolvedValue(mockComment);
      Reaction.toggleReaction = jest.fn().mockResolvedValue({
        action: "added",
        reaction: { _id: "r1" },
      });

      await addReaction(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockComment.reactionCount).toBe(2);
    });

    it("should return 404 if target post not found", async () => {
      req.body = { targetType: "post", targetId: "missing" };
      req.userId = "user456";
      Post.findOne.mockResolvedValue(null);

      await addReaction(req, res);

      expect(res.statusCode).toBe(404);
    });

    it("should return 400 for invalid target type", async () => {
      req.body = { targetType: "unknown", targetId: "id1" };
      req.userId = "user456";

      await addReaction(req, res);

      expect(res.statusCode).toBe(400);
      expect(res._getJSONData().message).toMatch(/Invalid target type/);
    });

    it("should return 403 for self-reaction on post", async () => {
      req.body = { targetType: "post", targetId: "post123" };
      req.userId = "owner789";

      const mockPost = {
        _id: "post123",
        userId: "owner789",
        reactionCount: 0,
        save: jest.fn(),
      };
      Post.findOne.mockResolvedValue(mockPost);
      Reaction.validateReaction = jest
        .fn()
        .mockRejectedValue(new Error("You cannot react to your own content"));

      await addReaction(req, res);

      expect(res.statusCode).toBe(403);
    });
  });

  // ── removeReaction ────────────────────────────────────────
  describe("removeReaction", () => {
    it("should remove a reaction and decrement target count", async () => {
      req.params = { id: "reaction123" };
      req.userId = "user456";

      const mockReaction = {
        _id: "reaction123",
        userId: { toString: () => "user456" },
        targetType: "post",
        targetId: "post123",
        deleteOne: jest.fn().mockResolvedValue(true),
      };
      Reaction.findById.mockResolvedValue(mockReaction);

      const mockPost = {
        reactionCount: 5,
        save: jest.fn().mockResolvedValue(true),
      };
      Post.findById.mockResolvedValue(mockPost);

      await removeReaction(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockPost.reactionCount).toBe(4);
      expect(mockReaction.deleteOne).toHaveBeenCalled();
    });

    it("should return 404 if reaction not found", async () => {
      req.params = { id: "nonexistent" };
      Reaction.findById.mockResolvedValue(null);

      await removeReaction(req, res);

      expect(res.statusCode).toBe(404);
    });

    it("should return 403 if not the reaction owner", async () => {
      req.params = { id: "reaction123" };
      req.userId = { toString: () => "otheruser" };

      const mockReaction = {
        userId: { toString: () => "user456" },
      };
      Reaction.findById.mockResolvedValue(mockReaction);

      await removeReaction(req, res);

      expect(res.statusCode).toBe(403);
    });
  });

  // ── getReactions ──────────────────────────────────────────
  describe("getReactions", () => {
    it("should return grouped reactions for a target", async () => {
      req.params = { targetType: "post", targetId: "post123" };

      const mockReactions = [
        { reactionType: "love", userId: { username: "alice" } },
        { reactionType: "love", userId: { username: "bob" } },
        { reactionType: "fire", userId: { username: "carol" } },
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockReactions),
      };
      Reaction.find.mockReturnValue(mockQuery);

      await getReactions(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.success).toBe(true);
      expect(data.total).toBe(3);
      expect(data.grouped.love).toHaveLength(2);
      expect(data.grouped.fire).toHaveLength(1);
    });

    it("should return empty when no reactions exist", async () => {
      req.params = { targetType: "post", targetId: "post123" };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([]),
      };
      Reaction.find.mockReturnValue(mockQuery);

      await getReactions(req, res);

      const data = res._getJSONData();
      expect(data.total).toBe(0);
      expect(data.reactions).toEqual([]);
    });
  });
});
