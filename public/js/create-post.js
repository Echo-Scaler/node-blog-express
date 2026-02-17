// Create post form handler
document.addEventListener("DOMContentLoaded", () => {
  const user = getUser();

  // Check authentication
  if (!isAuthenticated()) {
    window.location.href = "/login";
    return;
  }

  const createPostForm = document.getElementById("create-post-form");
  const messageDiv = document.getElementById("message");
  const categorySelect = document.getElementById("categoryId");
  const userInfo = document.getElementById("user-info");

  // Set user info
  if (userInfo && user) {
    userInfo.textContent = user.displayName || user.username;
  }

  // Load categories for dropdown
  loadCategories();

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

  createPostForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = document.querySelector('button[form="create-post-form"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Publishing...";

    const title = document.getElementById("title").value;
    const content = document.getElementById("content").value;
    const excerpt = document.getElementById("excerpt").value;
    const tagsInput = document.getElementById("tags").value;
    const categoryId = categorySelect.value;
    const status = document.getElementById("status").value;

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

      const data = await apiRequest("/posts", {
        method: "POST",
        body: formData,
      });

      messageDiv.innerHTML =
        '<p class="success">Post created successfully! Redirecting...</p>';

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
