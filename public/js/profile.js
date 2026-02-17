document.addEventListener("DOMContentLoaded", async () => {
  if (!isAuthenticated()) {
    window.location.href = "/login";
    return;
  }

  const form = document.getElementById("profile-form");
  const avatarInput = document.getElementById("avatar-input");
  const avatarPreview = document.getElementById("avatar-img");
  const avatarPlaceholder = document.getElementById("avatar-placeholder");

  // Load profile data
  try {
    const data = await apiRequest("/auth/profile");
    if (data.success) {
      const user = data.user;

      document.getElementById("displayName").value = user.displayName || "";
      document.getElementById("bio").value = user.bio || "";
      document.getElementById("email").value = user.email || "";
      document.getElementById("username").value = user.username || "";

      if (user.avatar) {
        avatarPreview.src = user.avatar;
        avatarPreview.style.display = "block";
        avatarPlaceholder.style.display = "none";
      } else {
        avatarPlaceholder.textContent = (
          user.displayName ||
          user.username ||
          "U"
        )
          .substring(0, 1)
          .toUpperCase();
      }
    }
  } catch (error) {
    console.error("Error loading profile:", error);
    alert("Failed to load profile.");
  }

  // Handle avatar preview
  avatarInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        avatarPreview.src = e.target.result;
        avatarPreview.style.display = "block";
        avatarPlaceholder.style.display = "none";
      };
      reader.readAsDataURL(file);
    }
  });

  // Handle submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append(
      "displayName",
      document.getElementById("displayName").value,
    );
    formData.append("bio", document.getElementById("bio").value);
    if (avatarInput.files[0]) {
      formData.append("avatar", avatarInput.files[0]);
    }

    try {
      const token = getToken();
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        if (result.user) {
          setUser(result.user);
          if (typeof updateAuthUI === "function") updateAuthUI();
        }
        window.location.href = "/";
      } else {
        throw new Error(result.message || "Update failed");
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  });
});
