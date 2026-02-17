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
    document.getElementById("status").value = post.status;
  } catch (error) {
    messageDiv.innerHTML = `<p class="error">Error loading post: ${error.message}</p>`;
    return;
  }

  // Handle form submission
  editPostForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value;
    const content = document.getElementById("content").value;
    const excerpt = document.getElementById("excerpt").value;
    const tagsInput = document.getElementById("tags").value;
    const status = document.getElementById("status").value;

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
        body: JSON.stringify({ title, content, excerpt, tags, status }),
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
