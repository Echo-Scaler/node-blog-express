// View post page
document.addEventListener("DOMContentLoaded", async () => {
  const postId = document.getElementById("post-id").value;
  const postContent = document.getElementById("post-content");
  const postActions = document.getElementById("post-actions");
  const reactionsContainer = document.getElementById("reactions-container");
  const reactionButtons = document.getElementById("reaction-buttons");
  const commentsContainer = document.getElementById("comments-container");
  const commentForm = document.getElementById("comment-form");

  let currentPost = null;
  const user = getUser();

  // Load post
  try {
    const data = await apiRequest(`/posts/${postId}`);
    currentPost = data.post;

    // Display post
    postContent.innerHTML = `
      <h1>${currentPost.title}</h1>
      <p class="post-meta">
        By ${currentPost.username} | 
        ${new Date(currentPost.createdAt).toLocaleDateString()} |
        Views: ${currentPost.viewCount} | 
        Comments: ${currentPost.commentCount} | 
        Reactions: ${currentPost.reactionCount}
      </p>
      ${currentPost.tags && currentPost.tags.length > 0 ? `<p class="tags">Tags: ${currentPost.tags.join(", ")}</p>` : ""}
      <div class="post-body">${currentPost.content}</div>
    `;

    // Show action buttons if user owns the post
    if (user && currentPost.userId === user._id) {
      postActions.style.display = "block";

      document.getElementById("edit-btn").addEventListener("click", () => {
        window.location.href = `/posts/${postId}/edit`;
      });

      document
        .getElementById("hide-btn")
        .addEventListener("click", async () => {
          try {
            await apiRequest(`/posts/${postId}/hide`, { method: "PATCH" });
            location.reload();
          } catch (error) {
            alert(`Error: ${error.message}`);
          }
        });

      document
        .getElementById("delete-btn")
        .addEventListener("click", async () => {
          if (!confirm("Are you sure you want to delete this post?")) return;
          try {
            await apiRequest(`/posts/${postId}`, { method: "DELETE" });
            window.location.href = "/dashboard";
          } catch (error) {
            alert(`Error: ${error.message}`);
          }
        });
    }

    // Load reactions
    loadReactions();

    // Load comments
    loadComments();

    // Show comment form if authenticated
    if (user) {
      commentForm.style.display = "block";
      commentForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const content = document.getElementById("comment-content").value;

        try {
          await apiRequest(`/comments/post/${postId}`, {
            method: "POST",
            body: JSON.stringify({ content }),
          });
          document.getElementById("comment-content").value = "";
          loadComments();
        } catch (error) {
          alert(`Error: ${error.message}`);
        }
      });
    }
  } catch (error) {
    postContent.innerHTML = `<p class="error">Error loading post: ${error.message}</p>`;
  }

  // Load reactions
  async function loadReactions() {
    try {
      const data = await apiRequest(`/reactions/post/${postId}`);

      // Display reaction counts
      let html = "<div>";
      if (data.grouped.like) html += `👍 ${data.grouped.like.length} `;
      if (data.grouped.love) html += `❤️ ${data.grouped.love.length} `;
      if (data.grouped.insightful)
        html += `💡 ${data.grouped.insightful.length} `;
      if (data.grouped.funny) html += `😄 ${data.grouped.funny.length} `;
      html += "</div>";
      reactionsContainer.innerHTML = html;

      // Show reaction buttons if authenticated and not own post
      if (user && currentPost.userId !== user._id) {
        reactionButtons.innerHTML = `
          <button class="reaction-btn" data-type="like">👍 Like</button>
          <button class="reaction-btn" data-type="love">❤️ Love</button>
          <button class="reaction-btn" data-type="insightful">💡 Insightful</button>
          <button class="reaction-btn" data-type="funny">😄 Funny</button>
        `;

        document.querySelectorAll(".reaction-btn").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const reactionType = btn.dataset.type;
            try {
              await apiRequest("/reactions", {
                method: "POST",
                body: JSON.stringify({
                  targetType: "post",
                  targetId: postId,
                  reactionType,
                }),
              });
              loadReactions();
            } catch (error) {
              alert(`Error: ${error.message}`);
            }
          });
        });
      }
    } catch (error) {
      console.error("Error loading reactions:", error);
    }
  }

  // Load comments
  async function loadComments() {
    try {
      const data = await apiRequest(`/comments/post/${postId}`);

      if (data.comments.length === 0) {
        commentsContainer.innerHTML =
          "<p>No comments yet. Be the first to comment!</p>";
        return;
      }

      let html = "";
      data.comments.forEach((comment) => {
        html += `
          <div class="comment-item">
            <p class="comment-author">${comment.username}</p>
            <p class="comment-date">${new Date(comment.createdAt).toLocaleDateString()}</p>
            <p>${comment.content}</p>
            ${
              user && comment.userId === user._id
                ? `<button onclick="deleteComment('${comment._id}')" class="btn btn-sm btn-danger">Delete</button>`
                : ""
            }
          </div>
        `;
      });

      commentsContainer.innerHTML = html;
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  }

  // Make deleteComment global
  window.deleteComment = async (commentId) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    try {
      await apiRequest(`/comments/${commentId}`, { method: "DELETE" });
      loadComments();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };
});
