// Dashboard - manage user's posts using the new CMS layout
document.addEventListener("DOMContentLoaded", async () => {
  // Check authentication
  if (!isAuthenticated()) {
    window.location.href = "/login";
    return;
  }

  const user = getUser();
  const postsContainer = document.getElementById("my-posts-container");
  const userInfo = document.getElementById("user-info");
  const noPostsMsg = document.getElementById("no-posts-msg");
  const paginationContainer = document.getElementById("pagination");

  let currentPage = 1;

  if (!user) return; // Safeguard

  // Set user info
  if (userInfo && user) {
    userInfo.textContent = user.displayName || user.username;
  }

  // Load posts function
  async function loadPosts() {
    try {
      const data = await apiRequest(
        `/posts/user/${user._id}?page=${currentPage}&limit=10`,
      );

      if (data.posts.length === 0 && currentPage === 1) {
        postsContainer.innerHTML = "";
        noPostsMsg.style.display = "block";
        paginationContainer.innerHTML = "";
        return;
      }

      noPostsMsg.style.display = "none";
      let html = "";

      data.posts.forEach((post) => {
        const date = new Date(post.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        const statusBadgeClass =
          post.status === "published"
            ? "badge-published"
            : post.status === "hidden"
              ? "badge-hidden"
              : "badge-draft";

        const categoryName = post.categoryId
          ? post.categoryId.name
          : "Uncategorized";

        html += `
        <tr>
          <td>
            <div style="font-weight: 700; color: var(--text-main); font-size: 15px;">${post.title}</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">${post.excerpt ? post.excerpt.substring(0, 60) + "..." : "No excerpt available"}</div>
          </td>
          <td>
            <span style="font-size: 13px; color: var(--text-secondary);">${categoryName}</span>
          </td>
          <td>
            <span class="badge ${statusBadgeClass}">${post.status.toUpperCase()}</span>
          </td>
          <td>
            <div style="font-weight: 600;">${post.viewCount}</div>
          </td>
          <td>
            <div style="color: var(--text-secondary); font-size: 13px;">${date}</div>
          </td>
          <td style="text-align: right;">
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
              <a href="/posts/${post._id}" class="action-btn" title="View">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              </a>
              <a href="/posts/${post._id}/edit" class="action-btn" title="Edit">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </a>
              <button onclick="toggleHide('${post._id}')" class="action-btn" title="${post.status === "hidden" ? "Make Public" : "Hide Story"}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
              </button>
              <button onclick="deletePost('${post._id}')" class="action-btn" style="color: #ef4444;" title="Delete">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
      });

      postsContainer.innerHTML = html;
      renderPagination(data.pagination);
    } catch (error) {
      postsContainer.innerHTML = `<tr><td colspan="6" class="error">Error loading posts: ${error.message}</td></tr>`;
    }
  }

  // Initial load
  loadPosts();

  function renderPagination(pagination) {
    if (!pagination || pagination.pages <= 1) {
      paginationContainer.innerHTML = "";
      return;
    }

    let html = "";
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

    paginationContainer.innerHTML = html;

    // Re-attach event listeners
    document
      .querySelectorAll(".pagination-btn:not([disabled])")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          const newPage = parseInt(btn.dataset.page);
          if (newPage > 0 && newPage <= totalPages) {
            currentPage = newPage;
            loadPosts();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        });
      });
  }
});

// Toggle post visibility (Global for onclick)
window.toggleHide = async function (postId) {
  try {
    await apiRequest(`/posts/${postId}/hide`, { method: "PATCH" });
    location.reload();
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
};

// Delete post (Global for onclick)
window.deletePost = async function (postId) {
  if (
    !confirm(
      "Are you sure you want to delete this story? This action cannot be undone.",
    )
  ) {
    return;
  }

  try {
    await apiRequest(`/posts/${postId}`, { method: "DELETE" });
    location.reload();
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
};
