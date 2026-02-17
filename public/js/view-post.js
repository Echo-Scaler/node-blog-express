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
    const date = new Date(currentPost.createdAt).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const readingTime = Math.ceil(currentPost.content.split(" ").length / 200);
    const categoryName = currentPost.categoryId
      ? currentPost.categoryId.name
      : "Uncategorized";

    postContent.innerHTML = `
      <header class="post-header">
        <div class="post-category">${categoryName}</div>
        <h1 class="post-title">${currentPost.title}</h1>
        <div class="post-meta-v2">
          <div class="story-author">
            <div class="author-dot"></div>
            <span style="font-weight: 700; color: var(--text-main);">${currentPost.username}</span>
          </div>
          <span>·</span>
          <span>${date}</span>
          <span>·</span>
          <span>${readingTime} min read</span>
        </div>
      </header>
      <div class="post-body">
        ${currentPost.content
          .split("\n")
          .map((p) => (p.trim() ? `<p>${p}</p>` : ""))
          .join("")}
      </div>
      <div style="max-width: 720px; margin: 40px auto; display: flex; gap: 8px; flex-wrap: wrap;">
        ${
          currentPost.tags && currentPost.tags.length > 0
            ? currentPost.tags
                .map((t) => `<span class="chip">${t}</span>`)
                .join("")
            : ""
        }
      </div>
    `;

    // Show action buttons if user owns the post
    if (user && currentPost.userId === user._id) {
      postActions.style.display = "flex";
      postActions.style.gap = "15px";

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

    // Load related posts
    loadRelatedPosts();

    // Show comment form if authenticated
    if (user) {
      commentForm.style.display = "block";
      commentForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const content = document.getElementById("comment-content").value;

        if (!content.trim()) return;

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
    postContent.innerHTML = `<p class="error">Error opening story: ${error.message}</p>`;
  }

  // Load reactions
  async function loadReactions() {
    try {
      const data = await apiRequest(`/reactions/post/${postId}`);

      // Display reaction counts
      let html =
        '<div style="display: flex; gap: 15px; font-size: 14px; color: var(--text-secondary);">';
      if (data.grouped.like)
        html += `<span>${data.grouped.like.length} claps</span>`;
      if (data.grouped.love)
        html += `<span>${data.grouped.love.length} loves</span>`;
      html += "</div>";
      reactionsContainer.innerHTML = html;

      // Show reaction buttons if authenticated and not own post
      if (user && currentPost.userId !== user._id) {
        reactionButtons.innerHTML = `
          <button class="reaction-btn btn-outline btn-sm" data-type="like">👏 Clap</button>
          <button class="reaction-btn btn-outline btn-sm" data-type="love">❤️ Love</button>
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

  const commentsPaginationContainer = document.getElementById(
    "comments-pagination",
  );
  let currentCommentPage = 1;

  // ... (rest of loadPost) ...

  // Load comments
  async function loadComments() {
    try {
      const data = await apiRequest(
        `/comments/post/${postId}?page=${currentCommentPage}&limit=10`,
      );

      if (data.comments.length === 0 && currentCommentPage === 1) {
        commentsContainer.innerHTML =
          "<p>No comments yet. Be the first to comment!</p>";
        commentsPaginationContainer.innerHTML = "";
        return;
      }

      let html = "";
      data.comments.forEach((comment) => {
        // ... (existing render logic) ...
        // Generate user initials for avatar
        const initials = comment.username
          ? comment.username.substring(0, 2).toUpperCase()
          : "U";

        const timeAgo = new Date(comment.createdAt).toLocaleDateString(
          "en-US",
          {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          },
        );

        html += `
          <div class="comment-item fb-style">
            <div class="comment-avatar">${initials}</div>
            <div class="comment-body">
                <div class="comment-bubble">
                    <div class="comment-header">
                        <span class="comment-author-name">${comment.username}</span>
                    </div>
                    <div id="comment-text-${comment._id}" class="comment-text">${comment.content}</div>
                </div>
                <div class="comment-actions">
                    <span>${timeAgo}</span>
                    <button class="action-link">Like</button>
                    ${
                      user && comment.userId === user._id
                        ? `
                        <button onclick="enableEditComment('${comment._id}')" class="action-link">Edit</button>
                        <button onclick="deleteComment('${comment._id}')" class="action-link delete-action">Delete</button>
                    `
                        : `<button class="action-link">Reply</button>`
                    }
                </div>
            </div>
          </div>
        `;
      });

      commentsContainer.innerHTML = html;
      renderCommentsPagination(data.pagination);
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  }

  function renderCommentsPagination(pagination) {
    if (!pagination || pagination.pages <= 1) {
      commentsPaginationContainer.innerHTML = "";
      return;
    }

    let html = "";
    const currentPage = pagination.page;
    const totalPages = pagination.pages;

    // Previous Button
    html += `<button class="pagination-btn arrow" ${currentPage === 1 ? "disabled" : ""} data-page="${currentPage - 1}">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
    </button>`;

    // Page Numbers Logic
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    range.push(1);

    for (let i = currentPage - delta; i <= currentPage + delta; i++) {
      if (i < totalPages && i > 1) {
        range.push(i);
      }
    }

    if (totalPages > 1) {
      range.push(totalPages);
    }

    let l;
    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push("...");
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    // Render Page Buttons
    rangeWithDots.forEach((page) => {
      if (page === "...") {
        html += `<span class="pagination-dots">...</span>`;
      } else {
        html += `<button class="pagination-btn ${page === currentPage ? "active" : ""}" data-page="${page}">${page}</button>`;
      }
    });

    // Next Button
    html += `<button class="pagination-btn arrow" ${currentPage === totalPages ? "disabled" : ""} data-page="${currentPage + 1}">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
    </button>`;

    commentsPaginationContainer.innerHTML = html;

    // Re-attach event listeners
    commentsPaginationContainer
      .querySelectorAll(".pagination-btn:not([disabled])")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          const newPage = parseInt(btn.dataset.page);
          if (newPage > 0 && newPage <= totalPages) {
            currentCommentPage = newPage;
            loadComments();
          }
        });
      });
  }

  // Load related posts
  async function loadRelatedPosts() {
    const container = document.getElementById("related-posts-container");
    if (!container) return;

    try {
      const data = await apiRequest(`/posts/${postId}/related`);
      if (data.success && data.posts.length > 0) {
        let html = "";
        data.posts.forEach((post) => {
          const date = new Date(post.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          const categoryName = post.categoryId ? post.categoryId.name : "Story";

          html += `
            <article class="story-card glass" style="padding: 20px;">
              <div class="story-category" style="font-size: 11px;">${categoryName}</div>
              <h4 style="font-size: 18px; margin-bottom: 12px;"><a href="/posts/${post._id}" style="text-decoration: none; color: inherit;">${post.title}</a></h4>
              <div class="story-footer" style="font-size: 12px;">
                <span>${post.username}</span>
                <span>${date}</span>
              </div>
            </article>
          `;
        });
        container.innerHTML = html;
      } else {
        container.innerHTML =
          '<p style="color: var(--text-secondary); grid-column: 1/-1;">No related stories yet. Explore more from the home page!</p>';
      }
    } catch (error) {
      console.error("Error loading related posts:", error);
    }
  }

  // Global functions for comment actions
  window.deleteComment = async (commentId) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    try {
      await apiRequest(`/comments/${commentId}`, { method: "DELETE" });
      loadComments();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  // Store original content for cancel action
  const originalComments = {};

  window.enableEditComment = (commentId) => {
    const textEl = document.getElementById(`comment-text-${commentId}`);
    if (!textEl) return;

    const currentContent = textEl.textContent;
    originalComments[commentId] = currentContent;

    textEl.innerHTML = `
        <textarea id="edit-input-${commentId}" class="comment-edit-area">${currentContent}</textarea>
        <div class="edit-actions">
            <button onclick="cancelEditComment('${commentId}')" class="btn btn-sm btn-outline" style="padding: 4px 8px; font-size: 12px;">Cancel</button>
            <button onclick="saveEditComment('${commentId}')" class="btn btn-sm btn-primary" style="padding: 4px 12px; font-size: 12px;">Save</button>
        </div>
      `;
  };

  window.cancelEditComment = (commentId) => {
    const textEl = document.getElementById(`comment-text-${commentId}`);
    if (textEl && originalComments[commentId] !== undefined) {
      textEl.textContent = originalComments[commentId];
      delete originalComments[commentId];
    }
  };

  window.saveEditComment = async (commentId) => {
    const input = document.getElementById(`edit-input-${commentId}`);
    if (!input) return;

    const newContent = input.value.trim();
    if (!newContent) return;

    try {
      await apiRequest(`/comments/${commentId}`, {
        method: "PUT",
        body: JSON.stringify({ content: newContent }),
      });
      loadComments(); // Reload to show updated content and reset view
    } catch (error) {
      alert(`Error updating comment: ${error.message}`);
    }
  };
});
