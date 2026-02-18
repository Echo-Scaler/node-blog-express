const httpMocks = require("node-mocks-http");
const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const {
  register,
  login,
  getProfile,
  updateProfile,
  getAllUsers,
  logout,
} = require("../../controllers/authController");

jest.mock("../../models/User");
jest.mock("jsonwebtoken");

describe("Auth Controller", () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
    process.env.JWT_EXPIRE = "7d";
  });

  // ── register ──────────────────────────────────────────────
  describe("register", () => {
    it("should register a new user and return 201 with token", async () => {
      req.body = {
        username: "testuser",
        email: "test@example.com",
        password: "Password123",
        displayName: "Test User",
      };

      User.findOne.mockResolvedValue(null);
      const mockUser = {
        _id: "user123",
        save: jest.fn().mockResolvedValue(true),
        toPublicProfile: jest.fn().mockReturnValue({
          _id: "user123",
          username: "testuser",
          displayName: "Test User",
        }),
      };
      User.mockImplementation(() => mockUser);
      jwt.sign.mockReturnValue("mock-token");

      await register(req, res);

      expect(res.statusCode).toBe(201);
      const data = res._getJSONData();
      expect(data.success).toBe(true);
      expect(data.token).toBe("mock-token");
      expect(data.user.username).toBe("testuser");
    });

    it("should return 400 if user already exists", async () => {
      req.body = {
        username: "existinguser",
        email: "existing@example.com",
        password: "Password123",
      };

      User.findOne.mockResolvedValue({ _id: "existing" });

      await register(req, res);

      expect(res.statusCode).toBe(400);
      expect(res._getJSONData().message).toMatch(/already exists/);
    });

    it("should return 500 on server error", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      req.body = { username: "test", email: "t@t.com", password: "pass" };
      User.findOne.mockRejectedValue(new Error("DB error"));

      await register(req, res);

      expect(res.statusCode).toBe(500);
      consoleSpy.mockRestore();
    });
  });

  // ── login ─────────────────────────────────────────────────
  describe("login", () => {
    it("should login successfully and return token", async () => {
      req.body = { email: "test@example.com", password: "Password123" };

      const mockUser = {
        _id: "user123",
        isActive: true,
        comparePassword: jest.fn().mockResolvedValue(true),
        toPublicProfile: jest.fn().mockReturnValue({
          _id: "user123",
          username: "testuser",
        }),
      };
      const mockSelect = jest.fn().mockResolvedValue(mockUser);
      User.findOne.mockReturnValue({ select: mockSelect });
      jwt.sign.mockReturnValue("mock-login-token");

      await login(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.success).toBe(true);
      expect(data.token).toBe("mock-login-token");
    });

    it("should return 401 if user not found", async () => {
      req.body = { email: "noone@example.com", password: "pass" };
      const mockSelect = jest.fn().mockResolvedValue(null);
      User.findOne.mockReturnValue({ select: mockSelect });

      await login(req, res);

      expect(res.statusCode).toBe(401);
      expect(res._getJSONData().message).toMatch(/Invalid/);
    });

    it("should return 401 if account is deactivated", async () => {
      req.body = { email: "test@example.com", password: "pass" };
      const mockUser = { _id: "u1", isActive: false };
      const mockSelect = jest.fn().mockResolvedValue(mockUser);
      User.findOne.mockReturnValue({ select: mockSelect });

      await login(req, res);

      expect(res.statusCode).toBe(401);
      expect(res._getJSONData().message).toMatch(/deactivated/);
    });

    it("should return 401 if password is invalid", async () => {
      req.body = { email: "test@example.com", password: "wrong" };
      const mockUser = {
        _id: "u1",
        isActive: true,
        comparePassword: jest.fn().mockResolvedValue(false),
      };
      const mockSelect = jest.fn().mockResolvedValue(mockUser);
      User.findOne.mockReturnValue({ select: mockSelect });

      await login(req, res);

      expect(res.statusCode).toBe(401);
      expect(res._getJSONData().message).toMatch(/Invalid/);
    });
  });

  // ── getProfile ────────────────────────────────────────────
  describe("getProfile", () => {
    it("should return the user profile", async () => {
      req.userId = "user123";
      const mockUser = {
        email: "test@example.com",
        toPublicProfile: jest.fn().mockReturnValue({
          _id: "user123",
          username: "testuser",
        }),
      };
      User.findById.mockResolvedValue(mockUser);

      await getProfile(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.success).toBe(true);
      expect(data.user.email).toBe("test@example.com");
    });

    it("should return 404 if user not found", async () => {
      req.userId = "nonexistent";
      User.findById.mockResolvedValue(null);

      await getProfile(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  // ── updateProfile ─────────────────────────────────────────
  describe("updateProfile", () => {
    it("should update displayName and bio", async () => {
      req.userId = "user123";
      req.body = { displayName: "New Name", bio: "New bio" };
      const mockUser = {
        displayName: "Old",
        bio: "",
        save: jest.fn().mockResolvedValue(true),
        toPublicProfile: jest.fn().mockReturnValue({
          _id: "user123",
          displayName: "New Name",
          bio: "New bio",
        }),
      };
      User.findById.mockResolvedValue(mockUser);

      await updateProfile(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockUser.displayName).toBe("New Name");
      expect(mockUser.bio).toBe("New bio");
      expect(mockUser.save).toHaveBeenCalled();
    });

    it("should update avatar when file is uploaded", async () => {
      req.userId = "user123";
      req.body = {};
      req.file = { filename: "avatar123.jpg" };
      const mockUser = {
        avatar: "",
        save: jest.fn().mockResolvedValue(true),
        toPublicProfile: jest.fn().mockReturnValue({ _id: "user123" }),
      };
      User.findById.mockResolvedValue(mockUser);

      await updateProfile(req, res);

      expect(mockUser.avatar).toBe("/uploads/avatar123.jpg");
    });

    it("should return 404 if user not found", async () => {
      req.userId = "nonexistent";
      req.body = {};
      User.findById.mockResolvedValue(null);

      await updateProfile(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  // ── getAllUsers ────────────────────────────────────────────
  describe("getAllUsers", () => {
    it("should return list of active users", async () => {
      const mockUsers = [
        { toPublicProfile: () => ({ _id: "u1", username: "alice" }) },
        { toPublicProfile: () => ({ _id: "u2", username: "bob" }) },
      ];
      const mockSort = jest.fn().mockResolvedValue(mockUsers);
      User.find.mockReturnValue({ sort: mockSort });

      await getAllUsers(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.users).toHaveLength(2);
    });
  });

  // ── logout ────────────────────────────────────────────────
  describe("logout", () => {
    it("should return success message", async () => {
      await logout(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().success).toBe(true);
      expect(res._getJSONData().message).toMatch(/Logout/);
    });
  });
});
