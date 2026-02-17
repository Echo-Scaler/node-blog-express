# Node.js Blog System

A comprehensive blog platform built with Node.js, Express, and MongoDB featuring posts, comments, reactions, and replies with proper user permissions and a CMS interface.

## Features

- ✅ **User Authentication** - JWT-based authentication with registration and login
- ✅ **Post Management** - Create, edit, delete, and hide posts through CMS
- ✅ **Comments & Replies** - Nested comment system with reply support
- ✅ **Reactions** - Like, love, insightful, and funny reactions
- ✅ **Business Rules** - Users cannot react to their own content
- ✅ **Soft Deletes** - Data preservation with soft delete functionality
- ✅ **Post Visibility** - Published, draft, and hidden status options
- ✅ **Share Tracking** - Track post shares
- ✅ **Modern UI** - Beautiful gradient design with glassmorphism effects

## Tech Stack

- **Backend:** Node.js, Express
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens)
- **Validation:** Express-validator
- **Template Engine:** EJS
- **Styling:** Modern CSS with gradients

## Database Structure

### Collections

1. **users** - User accounts and profiles
2. **posts** - Blog posts with metadata
3. **comments** - Comments on posts
4. **replies** - Replies to comments
5. **reactions** - Reactions to posts/comments/replies

## Installation

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)

### Setup

1. **Clone or navigate to the project directory:**

```bash
cd node-simple-blog
```

2. **Install dependencies:**

```bash
npm install
```

3. **Configure environment variables:**

Edit the `.env` file with your settings:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/blog-system
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRE=7d
NODE_ENV=development
```

4. **Start MongoDB:**

Make sure MongoDB is running on your system.

5. **Run the application:**

Development mode (with auto-restart):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

6. **Access the application:**

- CMS Interface: http://localhost:3000
- API Endpoints: http://localhost:3000/api

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (protected)
- `PUT /api/auth/profile` - Update profile (protected)
- `POST /api/auth/logout` - Logout (protected)

### Posts

- `GET /api/posts` - Get all published posts
- `GET /api/posts/:id` - Get single post
- `POST /api/posts` - Create post (protected)
- `PUT /api/posts/:id` - Update post (protected, owner only)
- `DELETE /api/posts/:id` - Delete post (protected, owner only)
- `PATCH /api/posts/:id/hide` - Toggle visibility (protected, owner only)
- `POST /api/posts/:id/share` - Increment share count
- `GET /api/posts/user/:userId` - Get posts by user

### Comments

- `GET /api/comments/post/:postId` - Get comments for post
- `POST /api/comments/post/:postId` - Create comment (protected)
- `PUT /api/comments/:id` - Update comment (protected, owner only)
- `DELETE /api/comments/:id` - Delete comment (protected, owner only)

### Replies

- `GET /api/replies/comment/:commentId` - Get replies for comment
- `POST /api/replies/comment/:commentId` - Create reply (protected)
- `PUT /api/replies/:id` - Update reply (protected, owner only)
- `DELETE /api/replies/:id` - Delete reply (protected, owner only)

### Reactions

- `POST /api/reactions` - Add/toggle reaction (protected)
- `DELETE /api/reactions/:id` - Remove reaction (protected)
- `GET /api/reactions/:targetType/:targetId` - Get reactions

## Usage

### 1. Register an Account

Navigate to http://localhost:3000/register and create an account.

### 2. Login

Login at http://localhost:3000/login with your credentials.

### 3. Create Posts

- Go to Dashboard or click "Create Post"
- Fill in title, content, tags, and select status
- Submit to create your post

### 4. Manage Posts

- View all your posts in the Dashboard
- Edit, hide/show, or delete your posts
- View post statistics (views, comments, reactions)

### 5. Engage with Content

- Comment on posts
- Reply to comments
- React to posts and comments (cannot react to your own content)
- Share posts

## Business Rules

### Reaction Validation

- Users **cannot** react to their own posts, comments, or replies
- Validation is enforced at the model level
- Returns 403 error if attempted

### Post Ownership

- Users can only edit/delete/hide their **own** posts
- Ownership validation on all modification endpoints

### Post Visibility

- **Published** - Visible to all users
- **Draft** - Only visible to owner
- **Hidden** - Temporarily hidden by owner

### Soft Deletes

- Posts, comments, and replies use soft deletes
- Data is preserved with `isDeleted: true` flag
- Filtered out in queries

## Project Structure

```
node-simple-blog/
├── config/
│   └── database.js          # MongoDB connection
├── models/
│   ├── User.js              # User schema
│   ├── Post.js              # Post schema
│   ├── Comment.js           # Comment schema
│   ├── Reply.js             # Reply schema
│   └── Reaction.js          # Reaction schema
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── postController.js    # Post CRUD
│   ├── commentController.js # Comment CRUD
│   ├── replyController.js   # Reply CRUD
│   └── reactionController.js # Reaction logic
├── middleware/
│   ├── auth.js              # JWT authentication
│   └── validation.js        # Request validation
├── routes/
│   ├── auth.js              # Auth routes
│   ├── posts.js             # Post routes
│   ├── comments.js          # Comment routes
│   ├── replies.js           # Reply routes
│   └── reactions.js         # Reaction routes
├── views/                   # EJS templates
├── public/                  # Static files
├── app.js                   # Express app
├── server.js                # Server entry point
└── package.json
```

## License

ISC

## Author

Your Name
