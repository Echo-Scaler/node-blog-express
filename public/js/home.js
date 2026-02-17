// Home page - display all published posts
document.addEventListener("DOMContentLoaded", async () => {
  const postsContainer = document.getElementById("posts-container");
  const currentPage = 1;

  try {
    const data = await apiRequest(`/posts?page=${currentPage}&limit=10`);

    if (data.posts.length === 0) {
      postsContainer.innerHTML = "<p>No posts available yet.</p>";
      return;
    }

    let html = '<div class="posts-list">';

    data.posts.forEach((post) => {
      html += `
        <div class="post-item">
          <h3><a href="/posts/${post._id}">${post.title}</a></h3>
          <p class="post-meta">
            By ${post.username} | 
            ${new Date(post.createdAt).toLocaleDateString()} |
            Views: ${post.viewCount} | Comments: ${post.commentCount} | Reactions: ${post.reactionCount}
          </p>
          <p>${post.excerpt}</p>
          <a href="/posts/${post._id}" class="btn btn-sm">Read More</a>
        </div>
      `;
    });

    html += "</div>";
    postsContainer.innerHTML = html;

    // Add pagination if needed
    if (data.pagination.pages > 1) {
      // Pagination logic here
    }
  } catch (error) {
    postsContainer.innerHTML = `<p class="error">Error loading posts: ${error.message}</p>`;
  }
});
