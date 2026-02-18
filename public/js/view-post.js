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
        ${
          currentPost.image
            ? `
        <div class="post-hero-image" style="max-width: 1000px; margin: 0 auto 40px; border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-md);">
          <img src="${currentPost.image}" alt="${currentPost.title}" style="width: 100%; height: auto; display: block;">
        </div>
        `
            : ""
        }
        <div class="post-category">${categoryName}</div>
        <h1 class="post-title">${currentPost.title}</h1>
        <div class="post-meta-v2">
          <div class="story-author">
            ${
              currentPost.userId.avatar
                ? `<img src="${currentPost.userId.avatar}" alt="${currentPost.username}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; margin-right: 8px;">`
                : `<div class="author-dot"></div>`
            }
            <span style="font-weight: 700; color: var(--text-main);">${currentPost.username}</span>
          </div>
          <span>·</span>
          <span>${date}</span>
          <span>·</span>
          <span>${readingTime} min read</span>
        </div>
      </header>
      <div class="post-body markdown-content">
        ${DOMPurify.sanitize(marked.parse(currentPost.content))}
        ${
          data.isTruncated
            ? `
            <div class="content-fade-overlay" style="
              height: 150px;
              margin-top: -150px;
              background: linear-gradient(transparent, var(--bg-main));
              position: relative;
              z-index: 10;
              pointer-events: none;
            "></div>
            <div class="register-cta glass" style="
              padding: 40px;
              text-align: center;
              margin-top: 0;
              border-radius: var(--radius-md);
              border: 1px solid var(--primary-glow);
              background: rgba(255, 255, 255, 0.7);
              backdrop-filter: blur(10px);
            ">
              <h3 style="margin-bottom: 12px; font-weight: 800; font-size: 24px;">Continue reading this story</h3>
              <p style="color: var(--text-secondary); margin-bottom: 24px; font-size: 16px;">Create a free account to get full access to this story and all other content on Byte & Beyond.</p>
              <div style="display: flex; gap: 16px; justify-content: center;">
                 <a href="/register" class="btn btn-primary" style="padding: 10px 24px; font-size: 16px;">Sign up for free</a>
                 <a href="/login" class="btn btn-outline" style="padding: 10px 24px; font-size: 16px;">Log in</a>
              </div>
            </div>
            `
            : ""
        }
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
    // Note: userId is now populated, so we check _id property
    if (
      user &&
      (currentPost.userId === user._id ||
        (currentPost.userId._id && currentPost.userId._id === user._id))
    ) {
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

      // Populate current user avatar in comment box
      const userAvatarSlot = document.getElementById("comment-user-avatar");
      if (userAvatarSlot) {
        if (user.avatar) {
          userAvatarSlot.innerHTML = `<img src="${user.avatar}" alt="${user.username}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
          const initials = user.username
            ? user.username.substring(0, 2).toUpperCase()
            : "U";
          userAvatarSlot.textContent = initials;
        }
      }

      commentForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const content = document.getElementById("comment-content").value;

        if (!content.trim()) return;

        try {
          await apiRequest(`/comments/post/${postId}`, {
            method: "POST",
            body: JSON.stringify({ content }),
          });
          const input = document.getElementById("comment-content");
          input.value = "";
          input.style.height = "40px"; // Reset height
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
        '<div style="display: flex; gap: 15px; font-size: 14px; color: var(--text-secondary); align-items: center;">';

      const loves = data.grouped.love || [];
      const loveCount = loves.length;

      let avatarsHtml = "";
      if (loves.length > 0) {
        avatarsHtml =
          '<div style="display: flex; margin-right: 8px; flex-direction: row-reverse; justify-content: flex-end; align-items: center;">';
        loves.slice(0, 3).forEach((r, idx) => {
          const u = r.userId;
          const uInits = u.username
            ? u.username.substring(0, 2).toUpperCase()
            : "U";
          const uAvatar = u.avatar
            ? `<img src="${u.avatar}" alt="${u.username}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 2px solid white;">`
            : uInits;
          avatarsHtml += `
            <div class="comment-avatar" style="width: 24px; height: 24px; font-size: 10px; margin-left: -8px; border: 2px solid white; z-index: ${4 - idx};">
              ${uAvatar}
            </div>
          `;
        });
        avatarsHtml += "</div>";
      }

      html += `
        <span id="love-count-display" style="cursor: pointer; display: flex; align-items: center;" class="hover-underline">
          ${avatarsHtml}
          <div style="background: #ef4444; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-right: 4px;">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          </div>
          <span style="font-weight: 500;">${loveCount} loves</span>
        </span>
      `;

      // Display comment count
      const commentCount = currentPost.commentCount || 0;
      html += `<span id="comment-count-display" style="cursor: pointer; display: flex; align-items: center; gap: 4px;" class="hover-underline">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
          ${commentCount} comments
        </span>`;

      html += "</div>";
      reactionsContainer.innerHTML = html;

      // Add click event for modal (Loves)
      document
        .getElementById("love-count-display")
        .addEventListener("click", () => {
          openInteractionsModal("likes");
        });

      // Add click event for modal (Comments)
      document
        .getElementById("comment-count-display")
        .addEventListener("click", () => {
          openInteractionsModal("comments");
        });

      // Show reaction buttons if authenticated and not own post
      // AND even if it is own post, maybe we want to allow them to see the button state but disabled?
      // For now, keeping logic: "Show reaction buttons if authenticated and not own post"
      // But actually, usually you can like your own post on many platforms.
      // The requirement says "1 loves create instead of heart icons".
      // Let's stick to the existing permission logic but strictly for Love.

      if (user) {
        // Check if user has already loved
        const userLoved =
          data.grouped.love &&
          data.grouped.love.some((r) => r.userId._id === user._id);

        reactionButtons.innerHTML = `
          <div style="display: flex; gap: 4px; width: 100%; border-top: 1px solid var(--border-light); border-bottom: 1px solid var(--border-light); padding: 4px 0;">
            <button class="reaction-btn ${userLoved ? "active-love" : ""}" data-type="love" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 8px; background: none; border: none; border-radius: 4px; cursor: pointer; color: ${userLoved ? "#ef4444" : "var(--text-secondary)"}; font-weight: 600; transition: background 0.2s;">
              <div style="background: ${userLoved ? "#ef4444" : "#e4e6eb"}; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
              </div>
              Love
            </button>
            <button id="action-comment-btn" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 8px; background: none; border: none; border-radius: 4px; cursor: pointer; color: var(--text-secondary); font-weight: 600; transition: background 0.2s;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
              Comment
            </button>
          </div>
        `;

        // Add hover effect
        document
          .querySelectorAll(".reaction-btn, #action-comment-btn")
          .forEach((btn) => {
            btn.addEventListener(
              "mouseenter",
              () => (btn.style.backgroundColor = "rgba(0,0,0,0.05)"),
            );
            btn.addEventListener(
              "mouseleave",
              () => (btn.style.backgroundColor = "transparent"),
            );
          });

        // Love Action
        document
          .querySelector(".reaction-btn[data-type='love']")
          .addEventListener("click", async (e) => {
            const btn = e.currentTarget;
            const reactionType = "love"; // Force Love
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

        // Comment Action - Scroll to form
        document
          .getElementById("action-comment-btn")
          .addEventListener("click", () => {
            const form = document.getElementById("comment-form");
            if (form) {
              form.scrollIntoView({ behavior: "smooth" });
              const input = document.getElementById("comment-content");
              if (input) input.focus();
            }
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
  const DOC_LIMIT = 9;

  // Load comments
  async function loadComments() {
    try {
      const data = await apiRequest(
        `/comments/post/${postId}?page=${currentCommentPage}&limit=${DOC_LIMIT}`,
      );

      if (data.comments.length === 0 && currentCommentPage === 1) {
        commentsContainer.innerHTML =
          "<p>No comments yet. Be the first to comment!</p>";
        commentsPaginationContainer.innerHTML = "";
        return;
      }

      let html = "";
      data.comments.forEach((comment) => {
        const initials = comment.username
          ? comment.username.substring(0, 2).toUpperCase()
          : "U";
        const avatarHtml = comment.userAvatar
          ? `<img src="${comment.userAvatar}" alt="${comment.username}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
          : initials;
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
          <div class="comment-thread" id="comment-thread-${comment._id}">
            <div class="comment-item fb-style" id="comment-wrapper-${comment._id}">
              <div class="comment-avatar">${avatarHtml}</div>
              <div class="comment-body">
                <div class="comment-bubble">
                  <div class="comment-header">
                    <span class="comment-author-name">${comment.username}</span>
                  </div>
                  <div id="comment-text-${comment._id}" class="comment-text">${comment.content}</div>
                </div>
                <div class="comment-actions">
                  <span>${timeAgo}</span>
                  <button 
                    class="action-link ${comment.isLiked ? "active-like" : ""}" 
                    onclick="toggleCommentLike('${comment._id}', ${comment.isLiked}, ${comment.reactionCount})" 
                    style="${comment.isLiked ? "color: #ef4444; font-weight: bold;" : ""}"
                    id="like-btn-${comment._id}"
                  >${comment.isLiked ? "Loved" : "Love"}</button>
                  <span 
                    class="comment-reaction-count" 
                    onclick="openCommentLikes('${comment._id}')" 
                    style="cursor: pointer; display: ${comment.reactionCount > 0 ? "inline-flex" : "none"}; align-items: center; gap: 2px; color: var(--text-secondary);"
                    id="like-count-display-${comment._id}"
                  >
                    <div style="background: #ef4444; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="white"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                    </div>
                    <span id="like-count-num-${comment._id}">${comment.reactionCount}</span>
                  </span>
                  ${user ? `<button onclick="toggleReplyForm('${comment._id}')" class="action-link">Reply</button>` : ""}
                  ${
                    user && String(comment.userId) === String(user._id)
                      ? `
                    <button onclick="enableEditComment('${comment._id}')" class="action-link">Edit</button>
                    <button onclick="deleteComment('${comment._id}')" class="action-link delete-action">Delete</button>
                  `
                      : ""
                  }
                </div>
              </div>
            </div>
            ${
              comment.replyCount > 0
                ? `
              <button class="reply-count-link" id="view-replies-btn-${comment._id}" onclick="toggleReplies('${comment._id}')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 10 20 15 15 20"></polyline><path d="M4 4v7a4 4 0 0 0 4 4h12"></path></svg>
                <span id="view-replies-text-${comment._id}">View ${comment.replyCount} ${comment.replyCount === 1 ? "reply" : "replies"}</span>
              </button>
            `
                : ""
            }
            <div class="replies-container" id="replies-container-${comment._id}" style="display: none;"></div>
            <div id="reply-form-slot-${comment._id}"></div>
          </div>
        `;
      });

      commentsContainer.innerHTML = html;
      renderCommentsPagination(data.pagination);

      // Update total comment count (including replies)
      if (data.pagination && data.pagination.totalWithReplies !== undefined) {
        updateTotalCommentCount(data.pagination.totalWithReplies);
      } else {
        updateTotalCommentCount();
      }
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  }

  // Calculate and update the total comment count including replies
  async function updateTotalCommentCount(countArg) {
    try {
      let totalCount = countArg;

      // If count isn't provided, fetch it efficiently
      if (totalCount === undefined) {
        const data = await apiRequest(`/comments/post/${postId}?limit=1`);
        totalCount = data.pagination ? data.pagination.totalWithReplies : 0;
      }

      // Update the stat display
      const countDisplay = document.getElementById("comment-count-display");
      if (countDisplay) {
        const svg = countDisplay.querySelector("svg");
        countDisplay.innerHTML = "";
        if (svg) countDisplay.appendChild(svg);
        countDisplay.append(` ${totalCount} comments`);
      }

      // Update the section header
      const header = document.querySelector(".comments-section h3");
      if (header) {
        header.textContent = `Responses (${totalCount})`;
      }
    } catch (e) {
      console.error("Error updating comment count:", e);
    }
  }

  // Toggle Comment Like
  window.toggleCommentLike = async (commentId, isLiked, currentCount) => {
    // Optimistic UI Update
    const btn = document.getElementById(`like-btn-${commentId}`);
    const countDisplay = document.getElementById(
      `like-count-display-${commentId}`,
    );
    const countNum = document.getElementById(`like-count-num-${commentId}`);

    // Determine new state
    const newLiked = !isLiked;
    const newCount = newLiked
      ? currentCount + 1
      : Math.max(0, currentCount - 1); // Should actually verify logic, but assuming simple toggle

    // Since we don't persist 'isLiked' in DOM easily without re-rendering,
    // we rely on the button state or arguments.
    // PROPER WAY: Re-fetch or careful DOM manipulation.
    // For now, let's use the button style as source of truth if we didn't have args,
    // but args are from *render time*. They are stale immediately after click!
    // BETTER: Check class 'active-like'.

    const isActive = btn.classList.contains("active-like");
    const actualNewLiked = !isActive;
    let actualNewCount = parseInt(countNum.innerText);
    actualNewCount = actualNewLiked
      ? actualNewCount + 1
      : Math.max(0, actualNewCount - 1);

    // Update UI
    if (actualNewLiked) {
      btn.classList.add("active-like");
      btn.style.color = "#ef4444";
      btn.style.fontWeight = "bold";
      btn.innerText = "Loved";
    } else {
      btn.classList.remove("active-like");
      btn.style.color = "";
      btn.style.fontWeight = "";
      btn.innerText = "Love";
    }

    countNum.innerText = actualNewCount;
    countDisplay.style.display = actualNewCount > 0 ? "inline-flex" : "none";

    try {
      await apiRequest("/reactions", {
        method: "POST",
        body: JSON.stringify({
          targetType: "comment",
          targetId: commentId,
          reactionType: "love",
        }),
      });
      // Reload comments to sync state perfectly? Or just leave optimistic?
      // optimstic is better for UX.
    } catch (error) {
      console.error("Error toggling like:", error);
      // Revert UI on error (omitted for brevity)
      alert("Failed to react");
    }
  };

  // Open Comment Likes Modal
  window.openCommentLikes = async (commentId) => {
    const modal = document.getElementById("interactions-modal");
    const likesList = document.getElementById("likes-list");
    const modalTitle = document.querySelector("#interactions-modal h3");
    const tabs = document.querySelector(".modal-tabs");

    modal.style.display = "flex";
    // Hide tabs, set title
    if (tabs) tabs.style.display = "none";
    if (modalTitle) modalTitle.innerText = "People who loved this comment";

    // Show likes list, hide comments list
    document.getElementById("likes-list").style.display = "block";
    document.getElementById("comments-list").style.display = "none";

    likesList.innerHTML = '<div class="loading">Loading...</div>';

    try {
      const data = await apiRequest(`/reactions/comment/${commentId}`);

      if (data.grouped && data.grouped.love) {
        likesList.innerHTML = data.grouped.love
          .map((c) => {
            const initials = c.username
              ? c.username.substring(0, 2).toUpperCase()
              : "U";

            const avatarHtml = c.userAvatar
              ? `<img src="${c.userAvatar}" alt="${c.username}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
              : initials;

            return `
                <div style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--border-light);">
                    <div class="comment-avatar" style="width: 40px; height: 40px; font-size: 14px;">${avatarHtml}</div>
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-weight: 600;">${c.username}</span>
                        <span style="font-size: 12px; color: var(--text-secondary);">${new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
            `;
          })
          .join("");
      } else {
        likesList.innerHTML =
          '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">No loves yet</div>';
      }
    } catch (error) {
      likesList.innerHTML = `<div class="error">Error loading likes: ${error.message}</div>`;
    }

    // Reset modal state on close?
    // We need to make sure 'closeInteractionsModal' resets the tabs visibility if used for post interactions later.
    const closeBtn = document.getElementById("close-modal-btn");
    const originalClose = closeBtn.onclick; // Preserving original might be tricky if it was addEventListener

    // We can just fix the reset in 'openInteractionsModal' to always show tabs.
  };

  // Original openInteractionsModal needs to ensure tabs are shown
  const originalOpenInteractionsModal = window.openInteractionsModal; // Assuming it's global? No, it's scoped.
  // I need to find where openInteractionsModal is defined and update it, OR check if I can modify it here.
  // Since I am replacing content, I can't easily access the scoped function unless I replace that part too.
  // I will just update openInteractionsModal definition in specific replacement if needed.
  // But wait, openInteractionsModal is defined in this file. I should update it to RESET the display.

  // ... rest of renderCommentsPagination ...

  function renderCommentsPagination(pagination) {
    if (!pagination) return;

    if (pagination.pages <= 1) {
      commentsPaginationContainer.innerHTML = "";
      commentsPaginationContainer.style.display = "none";
      return;
    }
    commentsPaginationContainer.style.display = "flex";

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

    // Add "View Commenters" button if there are comments
    if (pagination.total > 0) {
      html += `<button id="view-commenters-btn" class="btn btn-sm btn-outline" style="margin-left: 12px;">See who commented</button>`;
    }

    commentsPaginationContainer.innerHTML = html;

    // Attach event listener for View Commenters
    const viewCommentersBtn = document.getElementById("view-commenters-btn");
    if (viewCommentersBtn) {
      viewCommentersBtn.addEventListener("click", () => {
        openInteractionsModal("comments");
      });
    }

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

  // ====== REPLY FUNCTIONS ======

  // Toggle reply form visibility - opens inline under this comment thread
  window.toggleReplyForm = (commentId) => {
    const slot = document.getElementById(`reply-form-slot-${commentId}`);
    if (!slot) return;

    // If form already exists, toggle it off
    if (slot.innerHTML.trim()) {
      slot.innerHTML = "";
      return;
    }

    // Also expand replies if they exist but are hidden
    const repliesContainer = document.getElementById(
      `replies-container-${commentId}`,
    );
    if (repliesContainer && repliesContainer.style.display === "none") {
      const viewBtn = document.getElementById(`view-replies-btn-${commentId}`);
      if (viewBtn) {
        toggleReplies(commentId);
      }
    }

    const userInitials = user.username
      ? user.username.substring(0, 2).toUpperCase()
      : "U";

    const userAvatarHtml = user.avatar
      ? `<img src="${user.avatar}" alt="${user.username}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
      : userInitials;

    slot.innerHTML = `
      <div class="reply-form-container">
        <div class="comment-avatar">${userAvatarHtml}</div>
        <div class="reply-input-wrap">
          <textarea
            class="reply-input"
            id="reply-input-${commentId}"
            placeholder="Write a reply..."
            rows="1"
            oninput="this.style.height='auto'; this.style.height=this.scrollHeight+'px';"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();submitReply('${commentId}')}"
          ></textarea>
          <div class="reply-form-actions">
            <button class="reply-cancel-btn" onclick="toggleReplyForm('${commentId}')">Cancel</button>
            <button class="reply-submit-btn" id="reply-submit-${commentId}" onclick="submitReply('${commentId}')">Reply</button>
          </div>
        </div>
      </div>
    `;

    // Focus the input
    const input = document.getElementById(`reply-input-${commentId}`);
    if (input) input.focus();
  };

  // Toggle replies visibility (View X replies / Hide replies)
  window.toggleReplies = async (commentId) => {
    const container = document.getElementById(`replies-container-${commentId}`);
    const textEl = document.getElementById(`view-replies-text-${commentId}`);
    const thread = document.getElementById(`comment-thread-${commentId}`);
    if (!container) return;

    if (container.style.display === "none") {
      // Show replies
      container.style.display = "block";
      container.innerHTML =
        '<div style="padding: 8px 0; font-size: 13px; color: #65676b;">Loading...</div>';
      if (thread) thread.classList.add("has-replies");
      await loadReplies(commentId);
      if (textEl) textEl.textContent = "Hide replies";
    } else {
      // Hide replies
      container.style.display = "none";
      if (thread) thread.classList.remove("has-replies");
      // Restore original text from reply count
      const replyCount = container.querySelectorAll(".reply-item").length;
      if (textEl)
        textEl.textContent = `View ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`;
    }
  };

  // Submit a reply
  window.submitReply = async (commentId) => {
    const input = document.getElementById(`reply-input-${commentId}`);
    const submitBtn = document.getElementById(`reply-submit-${commentId}`);
    if (!input) return;

    const content = input.value.trim();
    if (!content) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";

    try {
      await apiRequest(`/replies/comment/${commentId}`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });

      // Clear the input but keep the form open for more replies
      input.value = "";
      input.style.height = "auto";
      submitBtn.disabled = false;
      submitBtn.textContent = "Reply";

      // Show replies container if hidden
      const repliesContainer = document.getElementById(
        `replies-container-${commentId}`,
      );
      if (repliesContainer) {
        repliesContainer.style.display = "block";
      }

      // Add thread line
      const thread = document.getElementById(`comment-thread-${commentId}`);
      if (thread) thread.classList.add("has-replies");

      // Reload replies to show the new one
      await loadReplies(commentId);

      // Update total comment count (including replies)
      updateTotalCommentCount();

      // Update or create the 'View X replies' button text
      const textEl = document.getElementById(`view-replies-text-${commentId}`);
      if (textEl) {
        textEl.textContent = "Hide replies";
      } else {
        // Create the button if first reply on this comment
        const commentWrapper = document.getElementById(
          `comment-wrapper-${commentId}`,
        );
        if (
          commentWrapper &&
          !document.getElementById(`view-replies-btn-${commentId}`)
        ) {
          const btn = document.createElement("button");
          btn.className = "reply-count-link";
          btn.id = `view-replies-btn-${commentId}`;
          btn.onclick = () => toggleReplies(commentId);
          btn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 10 20 15 15 20"></polyline><path d="M4 4v7a4 4 0 0 0 4 4h12"></path></svg>
            <span id="view-replies-text-${commentId}">Hide replies</span>
          `;
          commentWrapper.after(btn);
        }
      }

      // Focus input again for more replies
      input.focus();
    } catch (error) {
      alert(`Error posting reply: ${error.message}`);
      submitBtn.disabled = false;
      submitBtn.textContent = "Reply";
    }
  };

  // Load and render replies for a comment
  async function loadReplies(commentId) {
    const container = document.getElementById(`replies-container-${commentId}`);
    if (!container) return;

    try {
      const data = await apiRequest(`/replies/comment/${commentId}?limit=50`);
      const replies = data.replies || [];

      if (replies.length === 0) {
        container.innerHTML = "";
        // Remove thread line if no replies
        const thread = document.getElementById(`comment-thread-${commentId}`);
        if (thread) thread.classList.remove("has-replies");
        return;
      }

      // Add thread line class
      const thread = document.getElementById(`comment-thread-${commentId}`);
      if (thread) thread.classList.add("has-replies");

      let html = "";
      const commentAuthorName =
        document.querySelector(
          `#comment-wrapper-${commentId} .comment-author-name`,
        )?.textContent || "comment";

      replies.forEach((reply) => {
        const initials = reply.username
          ? reply.username.substring(0, 2).toUpperCase()
          : "U";
        const avatarHtml = reply.userAvatar
          ? `<img src="${reply.userAvatar}" alt="${reply.username}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
          : initials;
        const timeAgo = new Date(reply.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const isReplyOwner = user && String(reply.userId) === String(user._id);
        const isLiked = reply.isLiked || false;

        html += `
          <div class="reply-item" id="reply-wrapper-${reply._id}">
            <div class="comment-avatar">${avatarHtml}</div>
            <div class="comment-body">
              <div class="comment-bubble">
                <div class="comment-header">
                  <span class="comment-author-name">${reply.username}</span>
                </div>
                <div id="reply-text-${reply._id}" class="comment-text">
                  <span style="color: var(--primary); font-weight: 600; font-size: 13px;">@${commentAuthorName}</span> ${reply.content}
                </div>
              </div>
              <div class="comment-actions">
                <span>${timeAgo}</span>
                <button 
                  class="action-link ${isLiked ? "active-like" : ""}" 
                  onclick="toggleReplyLike('${reply._id}', ${reply.reactionCount})"
                  id="reply-like-btn-${reply._id}"
                  style="${isLiked ? "color: #ef4444; font-weight: bold;" : ""}"
                >${isLiked ? "Loved" : "Love"}</button>
                <span 
                  style="cursor: pointer; display: ${reply.reactionCount > 0 ? "inline-flex" : "none"}; align-items: center; gap: 2px; color: var(--text-secondary);"
                  id="reply-like-count-display-${reply._id}"
                  class="comment-reaction-badge"
                >
                  <div style="background: #ef4444; width: 14px; height: 14px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="white" stroke="white"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                  </div>
                  <span id="reply-like-count-num-${reply._id}" style="font-size: 11px;">${reply.reactionCount}</span>
                </span>
                ${user ? `<button onclick="toggleReplyForm('${commentId}')" class="action-link">Reply</button>` : ""}
                ${
                  isReplyOwner
                    ? `
                  <button onclick="enableEditReply('${reply._id}')" class="action-link">Edit</button>
                  <button onclick="deleteReply('${reply._id}', '${commentId}')" class="action-link delete-action">Delete</button>
                `
                    : ""
                }
              </div>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
    } catch (error) {
      container.innerHTML = `<div style="padding: 8px 0; color: red; font-size: 13px;">Error loading replies: ${error.message}</div>`;
    }
  }

  // Toggle Love on a reply
  window.toggleReplyLike = async (replyId, currentCount) => {
    const btn = document.getElementById(`reply-like-btn-${replyId}`);
    const countDisplay = document.getElementById(
      `reply-like-count-display-${replyId}`,
    );
    const countNum = document.getElementById(`reply-like-count-num-${replyId}`);

    const isActive = btn.classList.contains("active-like");
    const newLiked = !isActive;
    let actualCount = parseInt(countNum.innerText);
    actualCount = newLiked ? actualCount + 1 : Math.max(0, actualCount - 1);

    // Optimistic UI
    if (newLiked) {
      btn.classList.add("active-like");
      btn.style.color = "#ef4444";
      btn.style.fontWeight = "bold";
      btn.innerText = "Loved";
    } else {
      btn.classList.remove("active-like");
      btn.style.color = "";
      btn.style.fontWeight = "";
      btn.innerText = "Love";
    }
    countNum.innerText = actualCount;
    countDisplay.style.display = actualCount > 0 ? "inline-flex" : "none";

    try {
      await apiRequest("/reactions", {
        method: "POST",
        body: JSON.stringify({
          targetType: "reply",
          targetId: replyId,
          reactionType: "love",
        }),
      });
    } catch (error) {
      console.error("Error toggling reply like:", error);
      alert("Failed to react");
    }
  };

  // Edit reply
  const originalReplies = {};

  window.enableEditReply = (replyId) => {
    const textEl = document.getElementById(`reply-text-${replyId}`);
    if (!textEl) return;

    const currentContent = textEl.textContent;
    originalReplies[replyId] = currentContent;

    textEl.innerHTML = `
      <textarea id="edit-reply-input-${replyId}" class="comment-edit-area" style="font-size: 13px; min-height: 40px;">${currentContent}</textarea>
      <div class="edit-actions">
        <button onclick="cancelEditReply('${replyId}')" class="btn btn-sm btn-outline" style="padding: 3px 8px; font-size: 11px;">Cancel</button>
        <button onclick="saveEditReply('${replyId}')" class="btn btn-sm btn-primary" style="padding: 3px 10px; font-size: 11px;">Save</button>
      </div>
    `;
  };

  window.cancelEditReply = (replyId) => {
    const textEl = document.getElementById(`reply-text-${replyId}`);
    if (textEl && originalReplies[replyId] !== undefined) {
      textEl.textContent = originalReplies[replyId];
      delete originalReplies[replyId];
    }
  };

  window.saveEditReply = async (replyId) => {
    const input = document.getElementById(`edit-reply-input-${replyId}`);
    if (!input) return;

    const newContent = input.value.trim();
    if (!newContent) return;

    try {
      await apiRequest(`/replies/${replyId}`, {
        method: "PUT",
        body: JSON.stringify({ content: newContent }),
      });
      // Reload replies for the parent comment
      const replyWrapper = document.getElementById(`reply-wrapper-${replyId}`);
      const repliesContainer = replyWrapper
        ? replyWrapper.closest(".replies-container")
        : null;
      if (repliesContainer) {
        const commentId = repliesContainer.id.replace("replies-container-", "");
        await loadReplies(commentId);
      }
    } catch (error) {
      alert(`Error updating reply: ${error.message}`);
    }
  };

  // Delete reply
  window.deleteReply = async (replyId, commentId) => {
    if (!confirm("Are you sure you want to delete this reply?")) return;
    try {
      await apiRequest(`/replies/${replyId}`, { method: "DELETE" });
      await loadReplies(commentId);
      updateTotalCommentCount();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  // Interactions Modal Logic
  const modal = document.getElementById("interactions-modal");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const tabBtns = document.querySelectorAll(".tab-btn");
  const likesList = document.getElementById("likes-list");
  const commentsList = document.getElementById("comments-list");

  async function openInteractionsModal(tab = "likes") {
    modal.style.display = "flex";

    // Refresh counts for tabs
    try {
      const [reactionData, commentData] = await Promise.all([
        apiRequest(`/reactions/post/${postId}`),
        apiRequest(`/comments/post/${postId}?limit=1`),
      ]);

      const loveCount = reactionData.grouped.love
        ? reactionData.grouped.love.length
        : 0;
      const totalComments = commentData.pagination
        ? commentData.pagination.totalWithReplies
        : 0;

      tabBtns.forEach((btn) => {
        if (btn.dataset.tab === "likes") {
          btn.innerText = `Loves (${loveCount})`;
        } else if (btn.dataset.tab === "comments") {
          btn.innerText = `Comments (${totalComments})`;
        }
      });
    } catch (e) {
      console.error("Error refreshing modal counts:", e);
    }

    // Reset UI state for Post Interactions
    const modalTitle = document.querySelector("#interactions-modal h3");
    const tabs = document.querySelector(".modal-tabs");

    // Set default title for post interactions
    if (modalTitle) modalTitle.innerText = "Interactions";

    // Ensure tabs are visible (they might be hidden by openCommentLikes)
    if (tabs) tabs.style.display = "flex";

    switchTab(tab);
  }

  function closeInteractionsModal() {
    modal.style.display = "none";
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", closeInteractionsModal);
  }

  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeInteractionsModal();
    }
  });

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      switchTab(btn.dataset.tab);
    });
  });

  function switchTab(tab) {
    // Update tabs
    tabBtns.forEach((btn) => {
      if (btn.dataset.tab === tab) {
        btn.classList.add("active");
        btn.style.borderBottomColor = "var(--primary-color)";
        btn.style.color = "var(--text-main)";
        btn.style.fontWeight = "600";
      } else {
        btn.classList.remove("active");
        btn.style.borderBottomColor = "transparent";
        btn.style.color = "var(--text-secondary)";
        btn.style.fontWeight = "400";
      }
    });

    // Update content
    if (tab === "likes") {
      likesList.style.display = "block";
      commentsList.style.display = "none";
      fetchLikes();
    } else {
      likesList.style.display = "none";
      commentsList.style.display = "block";
      fetchCommenters();
    }
  }

  async function fetchLikes() {
    likesList.innerHTML =
      '<div class="loading-spinner" style="padding: 20px; text-align: center;">Loading...</div>';
    try {
      const data = await apiRequest(`/reactions/post/${postId}`);
      const loves = data.grouped.love || [];

      if (loves.length === 0) {
        likesList.innerHTML =
          '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">No loves yet.</div>';
        return;
      }

      let html = "";
      loves.forEach((reaction) => {
        const u = reaction.userId; // Populated user object
        const initials = u.username
          ? u.username.substring(0, 2).toUpperCase()
          : "U";

        const avatarHtml = u.avatar
          ? `<img src="${u.avatar}" alt="${u.username}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
          : initials;

        html += `
                <div style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--border-light);">
                    <div class="comment-avatar" style="width: 40px; height: 40px; font-size: 14px;">${avatarHtml}</div>
                    <span style="font-weight: 600;">${u.username}</span>
                </div>
            `;
      });
      likesList.innerHTML = html;
    } catch (error) {
      likesList.innerHTML = `<div style="padding: 20px; color: red;">Error: ${error.message}</div>`;
    }
  }

  async function fetchCommenters() {
    commentsList.innerHTML =
      '<div class="loading-spinner" style="padding: 20px; text-align: center;">Loading...</div>';
    try {
      const data = await apiRequest(`/comments/post/${postId}?limit=50`);
      const comments = data.comments || [];

      if (comments.length === 0) {
        commentsList.innerHTML =
          '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">No comments yet.</div>';
        return;
      }

      let html = "";
      comments.forEach((c) => {
        const initials = c.username
          ? c.username.substring(0, 2).toUpperCase()
          : "U";
        const timeAgo = new Date(c.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const isOwner = user && String(c.userId) === String(user._id);

        const avatarHtml = c.userAvatar
          ? `<img src="${c.userAvatar}" alt="${c.username}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
          : initials;

        html += `
          <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-light);">
            <div style="display: flex; gap: 10px; align-items: flex-start;">
              <div class="comment-avatar" style="width: 32px; height: 32px; min-width: 32px; font-size: 12px;">${avatarHtml}</div>
              <div style="flex: 1; min-width: 0;">
                <div class="comment-bubble" style="display: inline-block; max-width: 100%;">
                  <div class="comment-header">
                    <span class="comment-author-name">${c.username}</span>
                  </div>
                  <div id="modal-comment-text-${c._id}" class="comment-text">${c.content}</div>
                </div>
                <div class="comment-actions" style="margin-top: 4px; margin-left: 12px;">
                  <span>${timeAgo}</span>
                  ${
                    user
                      ? `
                    <button 
                      class="action-link ${c.isLiked ? "active-like" : ""}" 
                      onclick="toggleModalCommentLike('${c._id}', this)"
                      style="${c.isLiked ? "color: #ef4444; font-weight: bold;" : ""}"
                    >${c.isLiked ? "Loved" : "Love"}</button>
                  `
                      : ""
                  }
                  <span 
                    style="display: ${c.reactionCount > 0 ? "inline-flex" : "none"}; align-items: center; gap: 2px; color: var(--text-secondary);"
                    id="modal-like-count-${c._id}"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                    <span id="modal-like-num-${c._id}">${c.reactionCount}</span>
                  </span>
                  ${user ? `<button onclick="toggleModalReplyForm('${c._id}')" class="action-link">Reply</button>` : ""}
                  ${
                    isOwner
                      ? `
                    <button onclick="enableModalEditComment('${c._id}')" class="action-link">Edit</button>
                    <button onclick="deleteModalComment('${c._id}')" class="action-link delete-action">Delete</button>
                  `
                      : ""
                  }
                </div>
                ${
                  c.replyCount > 0
                    ? `
                  <button onclick="toggleModalReplies('${c._id}')" style="background: none; border: none; color: #65676b; font-weight: 600; font-size: 12px; cursor: pointer; margin-left: 12px; margin-top: 6px; display: flex; align-items: center; gap: 4px; padding: 2px 0;" id="modal-view-replies-btn-${c._id}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 10 20 15 15 20"></polyline><path d="M4 4v7a4 4 0 0 0 4 4h12"></path></svg>
                    <span id="modal-view-replies-text-${c._id}">View ${c.replyCount} ${c.replyCount === 1 ? "reply" : "replies"}</span>
                  </button>
                `
                    : ""
                }
                <div id="modal-replies-${c._id}" style="margin-left: 12px; margin-top: 4px; display: none;"></div>
                <div id="modal-reply-form-slot-${c._id}" style="margin-left: 12px;"></div>
              </div>
            </div>
          </div>
        `;
      });
      commentsList.innerHTML = html;
    } catch (error) {
      commentsList.innerHTML = `<div style="padding: 20px; color: red;">Error: ${error.message}</div>`;
    }
  }

  // --- Modal Comment Actions ---

  // Love toggle in modal
  window.toggleModalCommentLike = async (commentId, btn) => {
    const countDisplay = document.getElementById(
      `modal-like-count-${commentId}`,
    );
    const countNum = document.getElementById(`modal-like-num-${commentId}`);

    const isActive = btn.classList.contains("active-like");
    const newLiked = !isActive;
    let count = parseInt(countNum.innerText);
    count = newLiked ? count + 1 : Math.max(0, count - 1);

    if (newLiked) {
      btn.classList.add("active-like");
      btn.style.color = "#ef4444";
      btn.style.fontWeight = "bold";
      btn.innerText = "Loved";
    } else {
      btn.classList.remove("active-like");
      btn.style.color = "";
      btn.style.fontWeight = "";
      btn.innerText = "Love";
    }
    countNum.innerText = count;
    countDisplay.style.display = count > 0 ? "inline-flex" : "none";

    try {
      await apiRequest("/reactions", {
        method: "POST",
        body: JSON.stringify({
          targetType: "comment",
          targetId: commentId,
          reactionType: "love",
        }),
      });
      // Also sync the main comment list
      loadComments();
    } catch (error) {
      alert("Failed to react");
    }
  };

  // Toggle replies in modal (View X replies / Hide replies)
  window.toggleModalReplies = async (commentId) => {
    const container = document.getElementById(`modal-replies-${commentId}`);
    const textEl = document.getElementById(
      `modal-view-replies-text-${commentId}`,
    );
    if (!container) return;

    if (container.style.display === "none") {
      container.style.display = "block";
      container.innerHTML =
        '<div style="padding: 6px 0; font-size: 12px; color: #65676b;">Loading...</div>';
      try {
        const data = await apiRequest(`/replies/comment/${commentId}?limit=50`);
        const replies = data.replies || [];
        if (replies.length === 0) {
          container.innerHTML =
            '<div style="padding: 6px 0; font-size: 12px; color: #65676b;">No replies yet.</div>';
        } else {
          let replyHtml = "";
          replies.forEach((r) => {
            const rInitials = r.username
              ? r.username.substring(0, 2).toUpperCase()
              : "U";
            const rTime = new Date(r.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
            const rAvatarHtml = r.userAvatar
              ? `<img src="${r.userAvatar}" alt="${r.username}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
              : rInitials;
            replyHtml += `
              <div style="display: flex; gap: 8px; align-items: flex-start; margin-bottom: 6px;" id="modal-reply-wrapper-${r._id}">
                <div class="comment-avatar" style="width: 22px; height: 22px; min-width: 22px; font-size: 9px;">${rAvatarHtml}</div>
                <div style="flex: 1; min-width: 0;">
                  <div class="comment-bubble" style="display: inline-block; max-width: 100%; padding: 5px 10px; border-radius: 12px; font-size: 12px;">
                    <span style="font-weight: 700; font-size: 11px;">${r.username}</span>
                    <div style="font-size: 12px; line-height: 1.3;" id="modal-reply-text-${r._id}">${r.content}</div>
                  </div>
                  <div style="margin-left: 8px; margin-top: 2px; font-size: 10px; color: #65676b; display: flex; gap: 8px; align-items: center;">
                    <span>${rTime}</span>
                    <button class="action-link" onclick="toggleModalReplyLike('${r._id}', this)" style="font-size: 10px; ${r.isLiked ? "color: #ef4444; font-weight: bold;" : ""}">${r.isLiked ? "Loved" : "Love"}</button>
                    ${user ? `<button onclick="toggleModalReplyForm('${commentId}')" class="action-link" style="font-size: 10px;">Reply</button>` : ""}
                    ${
                      user && String(r.userId) === String(user._id)
                        ? `
                      <button onclick="enableModalEditReply('${r._id}')" class="action-link" style="font-size: 10px;">Edit</button>
                      <button onclick="deleteModalReply('${r._id}', '${commentId}')" class="action-link delete-action" style="font-size: 10px;">Delete</button>
                    `
                        : ""
                    }
                    ${r.reactionCount > 0 ? `<span style="margin-left: 4px; display: flex; align-items: center; gap: 2px;"><div style="background: #ef4444; width: 12px; height: 12px; border-radius: 50%; display: flex; align-items: center; justify-content: center;"><svg width="7" height="7" viewBox="0 0 24 24" fill="white" stroke="white"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg></div> <span id="modal-reply-like-num-${r._id}">${r.reactionCount}</span></span>` : ""}
                  </div>
                </div>
              </div>
            `;
          });
          container.innerHTML = replyHtml;
        }
        if (textEl) textEl.textContent = "Hide replies";
      } catch (err) {
        container.innerHTML =
          '<div style="padding: 6px 0; font-size: 12px; color: red;">Error loading replies</div>';
      }
    } else {
      container.style.display = "none";
      const replyCount = container.querySelectorAll(
        '[style*="display: flex"]',
      ).length;
      if (textEl)
        textEl.textContent = `View ${replyCount || ""} ${replyCount === 1 ? "reply" : "replies"}`;
    }
  };

  // Toggle reply form in modal (inline)
  window.toggleModalReplyForm = (commentId) => {
    const slot = document.getElementById(`modal-reply-form-slot-${commentId}`);
    if (!slot) return;

    if (slot.innerHTML.trim()) {
      slot.innerHTML = "";
      return;
    }

    // Also expand replies if hidden
    const repliesContainer = document.getElementById(
      `modal-replies-${commentId}`,
    );
    if (repliesContainer && repliesContainer.style.display === "none") {
      const viewBtn = document.getElementById(
        `modal-view-replies-btn-${commentId}`,
      );
      if (viewBtn) toggleModalReplies(commentId);
    }

    const userInitials = user.username
      ? user.username.substring(0, 2).toUpperCase()
      : "U";
    const userAvatarHtml = user.avatar
      ? `<img src="${user.avatar}" alt="${user.username}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
      : userInitials;

    slot.innerHTML = `
      <div style="display: flex; gap: 8px; align-items: flex-start; margin-top: 8px;">
        <div class="comment-avatar" style="width: 22px; height: 22px; min-width: 22px; font-size: 9px;">${userAvatarHtml}</div>
        <div style="flex: 1; background: #f0f2f5; border-radius: 16px; padding: 6px 10px;">
          <textarea
            id="modal-reply-input-${commentId}"
            placeholder="Write a reply..."
            rows="1"
            style="width: 100%; background: transparent; border: none; outline: none; font-family: inherit; font-size: 12px; resize: none; min-height: 24px; max-height: 100px; line-height: 1.4;"
            oninput="this.style.height='auto'; this.style.height=this.scrollHeight+'px';"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();submitModalReply('${commentId}')}"
          ></textarea>
          <div style="display: flex; gap: 4px; justify-content: flex-end; margin-top: 4px;">
            <button onclick="toggleModalReplyForm('${commentId}')" style="padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; cursor: pointer; border: 1px solid #ddd; background: white; color: #65676b;">Cancel</button>
            <button id="modal-reply-submit-${commentId}" onclick="submitModalReply('${commentId}')" style="padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; cursor: pointer; border: none; background: var(--primary); color: white;">Reply</button>
          </div>
        </div>
      </div>
    `;

    const input = document.getElementById(`modal-reply-input-${commentId}`);
    if (input) input.focus();
  };

  // Submit reply from the modal
  window.submitModalReply = async (commentId) => {
    const input = document.getElementById(`modal-reply-input-${commentId}`);
    const submitBtn = document.getElementById(
      `modal-reply-submit-${commentId}`,
    );
    if (!input) return;

    const content = input.value.trim();
    if (!content) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";

    try {
      await apiRequest(`/replies/comment/${commentId}`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });

      // Clear input but keep form open
      input.value = "";
      input.style.height = "auto";
      submitBtn.disabled = false;
      submitBtn.textContent = "Reply";

      // Show and reload replies in modal
      const repliesContainer = document.getElementById(
        `modal-replies-${commentId}`,
      );
      if (repliesContainer) {
        repliesContainer.style.display = "block";
        // Reload the replies
        const data = await apiRequest(`/replies/comment/${commentId}?limit=50`);
        const replies = data.replies || [];
        let replyHtml = "";
        replies.forEach((r) => {
          const rInitials = r.username
            ? r.username.substring(0, 2).toUpperCase()
            : "U";
          const rTime = new Date(r.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
          const isReplyOwner = user && String(r.userId) === String(user._id);
          const rAvatarHtml = r.userAvatar
            ? `<img src="${r.userAvatar}" alt="${r.username}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
            : rInitials;
          replyHtml += `
            <div style="display: flex; gap: 8px; align-items: flex-start; margin-bottom: 6px;" id="modal-reply-wrapper-${r._id}">
              <div class="comment-avatar" style="width: 22px; height: 22px; min-width: 22px; font-size: 9px;">${rAvatarHtml}</div>
              <div style="flex: 1; min-width: 0;">
                <div class="comment-bubble" style="display: inline-block; max-width: 100%; padding: 5px 10px; border-radius: 12px; font-size: 12px;">
                  <span style="font-weight: 700; font-size: 11px;">${r.username}</span>
                  <div style="font-size: 12px; line-height: 1.3;" id="modal-reply-text-${r._id}">${r.content}</div>
                </div>
                <div style="margin-left: 8px; margin-top: 2px; font-size: 10px; color: #65676b; display: flex; gap: 8px; align-items: center;">
                  <span>${rTime}</span>
                  <button class="action-link" onclick="toggleModalReplyLike('${r._id}', this)" style="font-size: 10px; ${r.isLiked ? "color: #ef4444; font-weight: bold;" : ""}">${r.isLiked ? "Loved" : "Love"}</button>
                  ${user ? `<button onclick="toggleModalReplyForm('${commentId}')" class="action-link" style="font-size: 10px;">Reply</button>` : ""}
                  ${
                    isReplyOwner
                      ? `
                    <button onclick="enableModalEditReply('${r._id}')" class="action-link" style="font-size: 10px;">Edit</button>
                    <button onclick="deleteModalReply('${r._id}', '${commentId}')" class="action-link delete-action" style="font-size: 10px;">Delete</button>
                  `
                      : ""
                  }
                  ${r.reactionCount > 0 ? `<span style="margin-left: 4px; display: flex; align-items: center; gap: 2px;"><div style="background: #ef4444; width: 12px; height: 12px; border-radius: 50%; display: flex; align-items: center; justify-content: center;"><svg width="7" height="7" viewBox="0 0 24 24" fill="white" stroke="white"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg></div> <span id="modal-reply-like-num-${r._id}">${r.reactionCount}</span></span>` : ""}
                </div>
              </div>
            </div>
          `;
        });
        repliesContainer.innerHTML = replyHtml;
      }

      // Update total comment count
      updateTotalCommentCount();

      // Update the toggle button text
      const textEl = document.getElementById(
        `modal-view-replies-text-${commentId}`,
      );
      if (textEl) textEl.textContent = "Hide replies";

      // Also sync the main page comments
      loadComments();

      // Focus input for more replies
      input.focus();
    } catch (error) {
      alert(`Error posting reply: ${error.message}`);
      submitBtn.disabled = false;
      submitBtn.textContent = "Reply";
    }
  };

  // Edit comment in modal
  const modalOriginalComments = {};

  window.enableModalEditComment = (commentId) => {
    const textEl = document.getElementById(`modal-comment-text-${commentId}`);
    if (!textEl) return;

    const currentContent = textEl.textContent;
    modalOriginalComments[commentId] = currentContent;

    textEl.innerHTML = `
      <textarea id="modal-edit-input-${commentId}" class="comment-edit-area" style="font-size: 13px;">${currentContent}</textarea>
      <div class="edit-actions">
        <button onclick="cancelModalEditComment('${commentId}')" class="btn btn-sm btn-outline" style="padding: 4px 8px; font-size: 12px;">Cancel</button>
        <button onclick="saveModalEditComment('${commentId}')" class="btn btn-sm btn-primary" style="padding: 4px 12px; font-size: 12px;">Save</button>
      </div>
    `;
  };

  window.cancelModalEditComment = (commentId) => {
    const textEl = document.getElementById(`modal-comment-text-${commentId}`);
    if (textEl && modalOriginalComments[commentId] !== undefined) {
      textEl.textContent = modalOriginalComments[commentId];
      delete modalOriginalComments[commentId];
    }
  };

  window.saveModalEditComment = async (commentId) => {
    const input = document.getElementById(`modal-edit-input-${commentId}`);
    if (!input) return;

    const newContent = input.value.trim();
    if (!newContent) return;

    try {
      await apiRequest(`/comments/${commentId}`, {
        method: "PUT",
        body: JSON.stringify({ content: newContent }),
      });
      // Refresh both modal and main list
      fetchCommenters();
      loadComments();
    } catch (error) {
      alert(`Error updating comment: ${error.message}`);
    }
  };

  // Delete comment in modal
  window.deleteModalComment = async (commentId) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    try {
      await apiRequest(`/comments/${commentId}`, { method: "DELETE" });
      // Refresh both modal and main list
      fetchCommenters();
      loadComments();
      updateTotalCommentCount();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  // Reply Like in modal
  window.toggleModalReplyLike = async (replyId, btn) => {
    const isLiked = btn.style.fontWeight === "bold";
    const numEl = document.getElementById(`modal-reply-like-num-${replyId}`);

    try {
      await apiRequest("/reactions", {
        method: "POST",
        body: JSON.stringify({
          targetId: replyId,
          targetType: "reply",
          reactionType: "love",
        }),
      });

      if (isLiked) {
        btn.style.color = "";
        btn.style.fontWeight = "";
        btn.innerText = "Love";
        if (numEl) numEl.innerText = Math.max(0, parseInt(numEl.innerText) - 1);
      } else {
        btn.style.color = "#ef4444";
        btn.style.fontWeight = "bold";
        btn.innerText = "Loved";
        if (numEl) numEl.innerText = (parseInt(numEl.innerText) || 0) + 1;
      }

      // Sync main view
      loadComments();
    } catch (error) {
      console.error("Error reacting to modal reply:", error);
    }
  };

  // Edit reply in modal
  window.enableModalEditReply = (replyId) => {
    const textEl = document.getElementById(`modal-reply-text-${replyId}`);
    if (!textEl) return;

    const currentContent = textEl.textContent;
    modalOriginalComments[`reply-${replyId}`] = currentContent;

    textEl.innerHTML = `
      <textarea id="modal-reply-edit-input-${replyId}" class="comment-edit-area" style="font-size: 12px; min-height: 40px;">${currentContent}</textarea>
      <div class="edit-actions">
        <button onclick="cancelModalEditReply('${replyId}')" class="btn btn-sm btn-outline" style="padding: 2px 6px; font-size: 10px;">Cancel</button>
        <button onclick="saveModalEditReply('${replyId}')" class="btn btn-sm btn-primary" style="padding: 2px 8px; font-size: 10px;">Save</button>
      </div>
    `;
  };

  window.cancelModalEditReply = (replyId) => {
    const textEl = document.getElementById(`modal-reply-text-${replyId}`);
    if (textEl && modalOriginalComments[`reply-${replyId}`] !== undefined) {
      textEl.textContent = modalOriginalComments[`reply-${replyId}`];
      delete modalOriginalComments[`reply-${replyId}`];
    }
  };

  window.saveModalEditReply = async (replyId) => {
    const input = document.getElementById(`modal-reply-edit-input-${replyId}`);
    if (!input) return;

    const newContent = input.value.trim();
    if (!newContent) return;

    try {
      await apiRequest(`/replies/${replyId}`, {
        method: "PUT",
        body: JSON.stringify({ content: newContent }),
      });
      // Refresh modal
      const textEl = document.getElementById(`modal-reply-text-${replyId}`);
      if (textEl) textEl.textContent = newContent;
      // Sync main view
      loadComments();
    } catch (error) {
      alert(`Error updating reply: ${error.message}`);
    }
  };

  // Delete reply in modal
  window.deleteModalReply = async (replyId, commentId) => {
    if (!confirm("Are you sure you want to delete this reply?")) return;
    try {
      await apiRequest(`/replies/${replyId}`, { method: "DELETE" });

      // Remove element from modal
      const wrapper = document.getElementById(`modal-reply-wrapper-${replyId}`);
      if (wrapper) wrapper.remove();

      // Update toggle text
      const container = document.getElementById(`modal-replies-${commentId}`);
      const textEl = document.getElementById(
        `modal-view-replies-text-${commentId}`,
      );
      if (container && textEl) {
        const replyCount = container.querySelectorAll(
          '[id^="modal-reply-wrapper-"]',
        ).length;
        textEl.textContent = `View ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`;
        if (replyCount === 0) container.style.display = "none";
      }

      // Sync main view
      loadComments();
      updateTotalCommentCount();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  // Reply from modal: close modal, scroll to comment, open reply form
  window.replyFromModal = (commentId) => {
    // legacy function if still called anywhere
    const modal = document.getElementById("interactions-modal");
    if (modal) modal.style.display = "none";
    const commentEl = document.getElementById(`comment-wrapper-${commentId}`);
    if (commentEl)
      commentEl.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => toggleReplyForm(commentId), 400);
  };
});
