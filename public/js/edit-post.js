// Edit post form handler
document.addEventListener("DOMContentLoaded", async () => {
  // Check authentication
  if (!isAuthenticated()) {
    window.location.href = "/login";
    return;
  }

  const postId = document.getElementById("post-id").value;
  const editPostForm = document.getElementById("edit-post-form");
  const messageDiv = document.getElementById("message");
  const categorySelect = document.getElementById("categoryId");
  const userInfo = document.getElementById("user-info");
  const user = getUser();

  if (userInfo && user) {
    userInfo.textContent = user.displayName || user.username;
  }

  // Load categories first
  await loadCategories();

  // Load existing post data
  try {
    const data = await apiRequest(`/posts/${postId}`);
    const post = data.post;

    // Populate form
    document.getElementById("title").value = post.title;
    document.getElementById("content").value = post.content;
    document.getElementById("excerpt").value = post.excerpt || "";
    document.getElementById("tags").value = post.tags
      ? post.tags.join(", ")
      : "";
    if (post.categoryId) {
      // Handle both populated object or direct ID
      categorySelect.value =
        typeof post.categoryId === "object"
          ? post.categoryId._id
          : post.categoryId;
    }
    document.getElementById("status").value = post.status;
  } catch (error) {
    messageDiv.innerHTML = `<p class="error">Error loading post: ${error.message}</p>`;
    return;
  }

  async function loadCategories() {
    try {
      const data = await apiRequest("/categories");
      if (data.success) {
        data.categories.forEach((category) => {
          const option = document.createElement("option");
          option.value = category._id;
          option.textContent = category.name;
          categorySelect.appendChild(option);
        });
      }
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  }

  // Handle form submission
  editPostForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value;
    const content = document.getElementById("content").value;
    const excerpt = document.getElementById("excerpt").value;
    const tagsInput = document.getElementById("tags").value;
    const status = document.getElementById("status").value;
    const categoryId = categorySelect.value;

    // Parse tags
    const tags = tagsInput
      ? tagsInput
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag)
      : [];

    try {
      const data = await apiRequest(`/posts/${postId}`, {
        method: "PUT",
        body: JSON.stringify({
          title,
          content,
          excerpt,
          tags,
          status,
          categoryId,
        }),
      });

      messageDiv.innerHTML =
        '<p class="success">Post updated successfully! Redirecting...</p>';

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    } catch (error) {
      messageDiv.innerHTML = `<p class="error">${error.message}</p>`;
    }
  });
});
