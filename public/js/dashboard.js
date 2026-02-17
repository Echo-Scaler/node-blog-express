// Dashboard - manage user's posts
document.addEventListener("DOMContentLoaded", async () => {
  // Check authentication
  if (!isAuthenticated()) {
    window.location.href = "/login";
    return;
  }

  const user = getUser();
  const postsContainer = document.getElementById("my-posts-container");

  try {
    const data = await apiRequest(`/posts/user/${user._id}`);

    if (data.posts.length === 0) {
      postsContainer.innerHTML = "<p>You haven't created any posts yet.</p>";
      return;
    }

    let html = '<div class="posts-list">';

    data.posts.forEach((post) => {
      html += `
        <div class="post-item">
          <h3>${post.title}</h3>
          <p class="post-meta">
            Status: <span class="status-${post.status}">${post.status}</span> | 
            Created: ${new Date(post.createdAt).toLocaleDateString()} |
            Views: ${post.viewCount} | Comments: ${post.commentCount} | Reactions: ${post.reactionCount}
          </p>
          <p>${post.excerpt}</p>
          <div class="post-actions">
            <a href="/posts/${post._id}" class="btn btn-sm">View</a>
            <a href="/posts/${post._id}/edit" class="btn btn-sm btn-secondary">Edit</a>
            <button onclick="toggleHide('${post._id}')" class="btn btn-sm btn-secondary">
              ${post.status === "hidden" ? "Show" : "Hide"}
            </button>
            <button onclick="deletePost('${post._id}')" class="btn btn-sm btn-danger">Delete</button>
          </div>
        </div>
      `;
    });

    html += "</div>";
    postsContainer.innerHTML = html;
  } catch (error) {
    postsContainer.innerHTML = `<p class="error">Error loading posts: ${error.message}</p>`;
  }
});

// Toggle post visibility
async function toggleHide(postId) {
  try {
    await apiRequest(`/posts/${postId}/hide`, { method: "PATCH" });
    location.reload();
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}

// Delete post
async function deletePost(postId) {
  if (!confirm("Are you sure you want to delete this post?")) {
    return;
  }

  try {
    await apiRequest(`/posts/${postId}`, { method: "DELETE" });
    location.reload();
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}
