const Post = require("../../models/Post");
const { getAllPosts } = require("../../controllers/postController");
const httpMocks = require("node-mocks-http");

jest.mock("../../models/Post");

describe("Post Controller - getAllPosts", () => {
  let req, res, next;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    next = jest.fn();
  });

  it("should return 200 and all posts", async () => {
    const mockPosts = [
      { title: "Post 1", content: "Content 1" },
      { title: "Post 2", content: "Content 2" },
    ];

    // Mock Mongoose chainable methods
    const mockFind = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue(mockPosts), // For promise resolution if awaited directly on populate return
      // Wait, await Post.find()... returns a Query, which is then awaited.
      // Jest mocks need to handle the promise resolution correctly.
    };

    // Correctly mocking the chain:
    // Post.find() -> returns object with sort() -> returns object with skip() ... -> finally resolves to mockPosts

    // Let's refine the mock to follow the controller logic:
    // Post.find(query).sort().skip().limit().select().populate().populate()

    const mockQuery = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
    };
    // The final populate() should allow being awaited to return the data.
    // We can make the final populate return a promise that resolves to mockPosts, OR make the object look like a promise.
    // Mongoose queries have a .then() method.
    mockQuery.populate.mockImplementation(() => {
      return {
        ...mockQuery,
        populate: jest.fn().mockImplementation(() => {
          return {
            then: (resolve) => resolve(mockPosts),
          };
        }),
      };
    });

    // Actually the code does .populate().populate().
    // So first populate returns mockQuery (this).
    // Second populate returns a thenable.

    // Simplified approach: make every method return `this` (mockQuery), and make `mockQuery` thenable.
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

  it("should handle errors", async () => {
    // Mock console.error to suppress expected error output
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

    // Verify console.error was called
    expect(consoleSpy).toHaveBeenCalledWith(
      "Get all posts error:",
      errorMessage,
    );

    // Restore console.error
    consoleSpy.mockRestore();
  });
});
