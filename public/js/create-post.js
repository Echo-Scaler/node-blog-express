// Create post form handler
document.addEventListener("DOMContentLoaded", () => {
  // Check authentication
  if (!isAuthenticated()) {
    window.location.href = "/login";
    return;
  }

  const createPostForm = document.getElementById("create-post-form");
  const messageDiv = document.getElementById("message");

  createPostForm.addEventListener("submit", async (e) => {
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
      const data = await apiRequest("/posts", {
        method: "POST",
        body: JSON.stringify({ title, content, excerpt, tags, status }),
      });

      messageDiv.innerHTML =
        '<p class="success">Post created successfully! Redirecting...</p>';

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    } catch (error) {
      messageDiv.innerHTML = `<p class="error">${error.message}</p>`;
    }
  });
});
