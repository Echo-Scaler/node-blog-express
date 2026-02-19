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

  // Load recent activity for profile (Limit 3)
  async function loadRecentActivity() {
    const container = document.getElementById("recent-activity-list");
    if (!container) return;

    try {
      const data = await apiRequest("/reactions/my-interactions");

      if (!data.success || !data.activity || data.activity.length === 0) {
        container.innerHTML =
          '<div style="padding: 30px; text-align: center; color: var(--text-secondary); font-size: 14px; background: #f8fafc; border-radius: 12px;">No recent activity to show.</div>';
        return;
      }

      // Limit to 3 items
      const recentActivity = data.activity.slice(0, 3);
      let html = '<div class="timeline-container">';

      recentActivity.forEach((item) => {
        const user = item.user;
        if (!user || user.isDeleted) return;

        const timeAgo = new Date(item.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        let actionHtml = "";
        let icon = "";

        if (item.type === "reaction") {
          const reactionType = item.reactionType || "love";
          if (reactionType === "love") {
            icon = "❤️";
            actionHtml = `loved your story <strong>${item.postTitle}</strong>`;
          } else {
            icon = "👍"; // Like
            actionHtml = `liked your story <strong>${item.postTitle}</strong>`;
          }
        } else if (item.type === "comment") {
          if (item.subType === "reply") {
            icon = "↩️";
            actionHtml = `replied to you on <strong>${item.postTitle}</strong>`;
          } else {
            icon = "💬";
            actionHtml = `commented on <strong>${item.postTitle}</strong>`;
          }
        }

        html += `
        <div class="timeline-item">
          <div class="timeline-dot"></div>
          <span class="timeline-time">${timeAgo}</span>
          <div class="timeline-content">
            <div class="timeline-header">
              <span style="font-weight: 700; color: var(--primary);">${user.username}</span> ${actionHtml}
            </div>
            ${
              item.content
                ? `<div style="font-size: 13px; color: var(--text-secondary); font-style: italic; margin-top: 8px; padding-left: 8px; border-left: 2px solid var(--border-light);">"${item.content}"</div>`
                : ""
            }
             <div style="margin-top: 8px;">
                 <a href="/posts/${item.postId}" class="timeline-link" style="font-size: 12px;">View Context &rarr;</a>
             </div>
          </div>
        </div>
      `;
      });

      html += "</div>"; // End timeline-container
      container.innerHTML = html;
    } catch (error) {
      console.error("Profile: Error loading activity:", error);
      container.innerHTML =
        '<div style="padding: 20px; text-align: center; color: #ef4444; font-size: 13px;">Failed to load activity.</div>';
    }
  }

  loadRecentActivity();
});
