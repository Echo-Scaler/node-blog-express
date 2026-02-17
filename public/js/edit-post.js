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

    // Show existing image preview if available
    const preview = document.getElementById("image-preview");
    const placeholder = document.getElementById("upload-placeholder");
    if (post.image) {
      preview.src = post.image;
      preview.style.display = "block";
      placeholder.style.display = "none";
    }
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

    const submitBtn = document.querySelector('button[form="edit-post-form"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving...";

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
      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content);
      formData.append("excerpt", excerpt);
      formData.append("status", status);
      formData.append("categoryId", categoryId);

      tags.forEach((tag) => {
        formData.append("tags[]", tag);
      });

      const imageInput = document.getElementById("image");
      if (imageInput.files[0]) {
        formData.append("image", imageInput.files[0]);
      }

      const data = await apiRequest(`/posts/${postId}`, {
        method: "PUT",
        body: formData,
      });

      messageDiv.innerHTML =
        '<p class="success">Post updated successfully! Redirecting...</p>';

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    } catch (error) {
      messageDiv.innerHTML = `<p class="error">${error.message}</p>`;
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });
});
