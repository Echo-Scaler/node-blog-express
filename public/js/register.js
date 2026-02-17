// Register form handler
document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("register-form");
  const messageDiv = document.getElementById("message");

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const displayName = document.getElementById("displayName").value;

    try {
      const data = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, email, password, displayName }),
      });

      // Save token and user
      setToken(data.token);
      setUser(data.user);

      // Show success message
      messageDiv.innerHTML =
        '<p class="success">Registration successful! Redirecting...</p>';

      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    } catch (error) {
      messageDiv.innerHTML = `<p class="error">${error.message}</p>`;
    }
  });
});
