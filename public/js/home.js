// Home page - display all published posts with category filtering and global news integration
document.addEventListener("DOMContentLoaded", async () => {
  const postsContainer = document.getElementById("posts-container");
  const categoryChips = document.getElementById("category-chips");
  const paginationContainer = document.getElementById("pagination");
  const pageRange = document.getElementById("page-range");
  const totalCount = document.getElementById("total-count");
  const btnLocal = document.getElementById("btn-local");
  const btnGlobal = document.getElementById("btn-global");

  let currentSource = "global"; // Default to global news for higher visibility
  let currentCategoryId = "";
  let currentPage = 1;
  const limit = 9;

  // Initialize
  await loadCategories();
  await loadData();

  // Source Toggle Event Listeners
  btnLocal.addEventListener("click", () => switchSource("local"));
  btnGlobal.addEventListener("click", () => switchSource("global"));

  function switchSource(source) {
    if (currentSource === source) return;

    currentSource = source;
    currentCategoryId = ""; // Reset category to avoid invalid ID errors
    currentPage = 1;

    // Reset all buttons first
    [btnLocal, btnGlobal].forEach((btn) => {
      btn.classList.remove("active");
      btn.classList.add("btn-outline");
      btn.style.border = "none";
    });

    if (source === "local") {
      btnLocal.classList.add("active");
      btnLocal.classList.remove("btn-outline");
      categoryChips.style.opacity = "1";
      categoryChips.style.pointerEvents = "auto";
    } else if (source === "global") {
      btnGlobal.classList.add("active");
      btnGlobal.classList.remove("btn-outline");
      categoryChips.style.opacity = "1";
      categoryChips.style.pointerEvents = "auto";
    }

    loadData();
  }

  async function loadData() {
    if (currentSource === "local") {
      await loadPosts();
    } else if (currentSource === "global") {
      await loadNews();
    }
  }

  async function loadCategories() {
    try {
      const data = await apiRequest("/categories");
      if (data.success) {
        data.categories.forEach((category) => {
          // Filter out Sports and Travel
          const nameLower = category.name.toLowerCase();
          if (nameLower === "sports" || nameLower === "travel") return;

          const chip = document.createElement("div");
          chip.className = "chip";
          chip.textContent = category.name;
          chip.dataset.id = category._id;
          chip.addEventListener("click", () => {
            selectCategory(category._id, chip);
          });
          categoryChips.appendChild(chip);
        });
      }
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  }

  async function loadPosts() {
    postsContainer.innerHTML =
      '<div class="loading">Loading incredible stories...</div>';

    try {
      let url = `/posts?page=${currentPage}&limit=${limit}`;
      if (currentCategoryId) {
        url += `&categoryId=${currentCategoryId}`;
      }

      const data = await apiRequest(url);

      if (data.posts.length === 0) {
        postsContainer.innerHTML =
          '<div class="no-posts" style="grid-column: 1/-1; text-align: center; padding: 60px;"><h3>No stories found.</h3><p>Try selecting another category or check back later!</p></div>';
        paginationContainer.innerHTML = "";
        return;
      }

      let html = "";
      data.posts.forEach((post) => {
        const date = new Date(post.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        const categoryName = post.categoryId
          ? post.categoryId.name
          : "Uncategorized";
        const readTime = Math.ceil(post.content.split(" ").length / 200);

        html += `
          <article class="story-card glass" onclick="checkAuthAndNavigateLocal('/posts/${post._id}')" style="cursor: pointer;">
            ${
              post.image
                ? `
            <div class="story-image" style="height: 200px; margin: -24px -24px 20px -24px; overflow: hidden; border-bottom: 1px solid var(--border-light);">
                <img src="${post.image}" alt="${post.title}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease;">
            </div>
            `
                : ""
            }
            <div class="story-category">${categoryName}</div>
            <h3><a href="javascript:void(0)" style="text-decoration: none; color: inherit;">${post.title}</a></h3>
            <p class="story-excerpt">${post.excerpt || post.content.substring(0, 120) + "..."}</p>
            <div class="story-footer">
              <div class="story-author">
                ${
                  post.userId && post.userId.avatar
                    ? `<img src="${post.userId.avatar}" alt="${post.username}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; margin-right: 8px;">`
                    : `<div class="author-dot"></div>`
                }
                <span>${post.username}</span>
              </div>
              <span>${date} · ${readTime} min read</span>
            </div>
          </article>
        `;
      });

      postsContainer.innerHTML = html;
      renderPagination(data.pagination);
    } catch (error) {
      postsContainer.innerHTML = `<p class="error" style="grid-column: 1/-1;">Error loading stories: ${error.message}</p>`;
    }
  }

  async function loadNews() {
    postsContainer.innerHTML =
      '<div class="loading">Fetching global headlines...</div>';

    try {
      // NewsAPI doesn't have a simple total count for free tier pagination in the same way,
      // but we'll fetch a fixed amount for now.
      const data = await apiRequest(
        `/news?category=${currentCategoryId || "general"}&page=${currentPage}&limit=${limit}`,
      );

      if (!data.articles || data.articles.length === 0) {
        postsContainer.innerHTML =
          '<div class="no-posts" style="grid-column: 1/-1; text-align: center; padding: 60px;"><h3>No global news available.</h3><p>Try a different category or verify your API key.</p></div>';
        paginationContainer.innerHTML = "";
        return;
      }

      let html = "";
      data.articles.forEach((article) => {
        const date = new Date(article.publishedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });

        html += `
          <article class="story-card glass news-card" onclick="checkAuthAndNavigate('${article.url}')" style="cursor: pointer;">
            ${article.urlToImage ? `<div class="story-image" style="height: 200px; overflow: hidden; border-radius: 8px 8px 0 0;"><img src="${article.urlToImage}" alt="${article.title}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'"></div>` : ""}
            <div class="story-content" style="padding: ${article.urlToImage ? "20px" : "24px"};">
              <div class="story-category" style="background: rgba(16, 185, 129, 0.1); color: #10b981;">GLOBAL NEWS</div>
              <h3><a href="javascript:void(0)" style="text-decoration: none; color: inherit;">${article.title}</a></h3>
              <p class="story-excerpt">${article.description || "No description available."}</p>
              <div class="story-footer">
                 <div class="story-author">
                    <span style="font-weight: 600;">${article.source}</span>
                 </div>
                 <span>${date}</span>
              </div>
            </div>
          </article>
        `;
      });

      postsContainer.innerHTML = html;
      renderPagination(data.pagination);
    } catch (error) {
      postsContainer.innerHTML = `<p class="error" style="grid-column: 1/-1;">Error loading news: ${error.message}</p>`;
    }
  }

  function selectCategory(id, chipElement) {
    // Determine category based on source
    let categoryValue = id;

    if (currentSource === "global") {
      // For global news, map the category name to NewsAPI allowed categories
      if (!id) {
        categoryValue = ""; // All
      } else {
        const text = chipElement
          ? chipElement.textContent.trim().toLowerCase()
          : "";
        const allowed = [
          "business",
          "entertainment",
          "general",
          "health",
          "science",
          "technology",
        ];
        categoryValue = allowed.includes(text) ? text : "general";
      }
    }

    document
      .querySelectorAll(".chip")
      .forEach((c) => c.classList.remove("active"));

    if (chipElement) {
      chipElement.classList.add("active");
    } else {
      const allChip = document.querySelector('.chip[data-id=""]');
      if (allChip) allChip.classList.add("active");
    }

    currentCategoryId = categoryValue;
    currentPage = 1;
    loadData();
  }

  function renderPagination(pagination) {
    if (!pagination) return;

    // Update Info Text
    const total = pagination.total || 0;
    const start = total === 0 ? 0 : (pagination.page - 1) * limit + 1;
    const end = Math.min(pagination.page * limit, total);

    if (pageRange) pageRange.textContent = `${start}-${end}`;
    if (totalCount) totalCount.textContent = total;

    if (pagination.pages <= 1) {
      paginationContainer.innerHTML = "";
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
    const delta = 2; // Number of pages to show around current page
    const range = [];
    const rangeWithDots = [];

    range.push(1); // Always show first page

    for (let i = currentPage - delta; i <= currentPage + delta; i++) {
      if (i < totalPages && i > 1) {
        range.push(i);
      }
    }

    range.push(totalPages); // Always show last page

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
            currentPage = newPage; // Update variable scope
            // We need to update the parent scope's currentPage variable if possible,
            // but since 'currentPage' is defined in the outer scope, we modify it directly via closure,
            // assuming this function is inside the DOMContentLoaded callback.
            // However, let's just call loadData() after updating the specific scope variable if it was passed,
            // BUT wait, 'currentPage' is in the outer scope of 'home.js'.
            // To be safe, we should update the outer 'currentPage' variable.
            // The outer variable is 'currentPage'.

            // Actually, the closure captures 'currentPage' from line 11.
            // So we can just update it.
            // But wait, in lines 211 and 239 of original code, it was doing exactly that.
            // So I should ensure I'm updating the correct variable.

            // I'll emit a custom event or just update the variable directly since I'm in the same scope.
            updateCurrentPage(newPage);
          }
        });
      });
  }

  // Helper to update page and reload
  function updateCurrentPage(page) {
    currentPage = page;
    loadData();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Handle "All Stories" click
  document.querySelector('.chip[data-id=""]').addEventListener("click", () => {
    selectCategory("", null);
  });

  // Login Modal Logic
  const loginModal = document.getElementById("login-modal");
  const closeLoginModalBtn = document.getElementById("close-login-modal");

  function showLoginModal() {
    if (loginModal) {
      loginModal.style.display = "flex";
      // Prevent scrolling on body
      document.body.style.overflow = "hidden";
    }
  }

  function hideLoginModal() {
    if (loginModal) {
      loginModal.style.display = "none";
      document.body.style.overflow = "";
    }
  }

  if (closeLoginModalBtn) {
    closeLoginModalBtn.addEventListener("click", hideLoginModal);
  }

  window.addEventListener("click", (e) => {
    if (e.target === loginModal) {
      hideLoginModal();
    }
  });

  // Expose for usage in inline onclick
  window.checkAuthAndNavigate = (url) => {
    const user = localStorage.getItem("user");
    if (user) {
      window.open(url, "_blank");
    } else {
      showLoginModal();
    }
  };

  window.checkAuthAndNavigateLocal = (url) => {
    const user = localStorage.getItem("user");
    if (user) {
      window.location.href = url;
    } else {
      showLoginModal();
    }
  };
});
