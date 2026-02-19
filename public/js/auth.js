// API base URL
const API_URL = "/api";

// Get token from localStorage
const getToken = () => localStorage.getItem("token");

// Set token in localStorage
const setToken = (token) => localStorage.setItem("token", token);

// Remove token from localStorage
const removeToken = () => localStorage.removeItem("token");

// Get user from localStorage
const getUser = () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

// Set user in localStorage
const setUser = (user) => localStorage.setItem("user", JSON.stringify(user));

// Remove user from localStorage
const removeUser = () => localStorage.removeItem("user");

// Check if user is authenticated
const isAuthenticated = () => !!getToken();

// API request helper
const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // If body is FormData, let browser set Content-Type with boundary
  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = { message: await response.text() };
    }

    if (!response.ok) {
      if (response.status === 401) {
        // Clear stale session
        const wasAuthenticated = !!getToken();
        removeToken();
        removeUser();

        // If this wasn't a login attempt, decide whether to redirect or reload
        if (!endpoint.includes("/auth/login") && wasAuthenticated) {
          const protectedPaths = [
            "/dashboard",
            "/profile",
            "/posts/create",
            "/posts/edit",
          ];
          const isProtected = protectedPaths.some((p) =>
            location.pathname.startsWith(p),
          );

          if (isProtected) {
            window.location.href = "/login";
            return; // Stop execution
          } else {
            // Public page: reload once to clear UI state (now that token is gone)
            location.reload();
            return; // Stop execution
          }
        }
      }

      const error = new Error(
        data.message || `Request failed with status ${response.status}`,
      );
      if (data.errors) {
        error.errors = data.errors;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`API Request Error [${endpoint}]:`, error);
    throw error;
  }
};

// Update UI based on auth status
const updateAuthUI = () => {
  const user = getUser();
  const userInfo = document.getElementById("user-info");
  const loginLink = document.getElementById("login-link");
  const registerLink = document.getElementById("register-link");
  const logoutBtn = document.getElementById("logout-btn");
  const profileLink = document.getElementById("profile-link");
  const writeLink = document.querySelector(".write-link");
  const libraryLink = document.querySelector('a[href="/dashboard"]');
  const userMenu = document.querySelector(".user-menu");
  const headerAvatar = document.getElementById("header-avatar");

  if (user) {
    if (userInfo) userInfo.textContent = user.displayName || user.username;
    if (userMenu) userMenu.style.display = "flex";
    if (headerAvatar) {
      headerAvatar.src =
        user.avatar ||
        "https://ui-avatars.com/api/?name=" +
          encodeURIComponent(user.displayName || user.username) +
          "&background=random";
    }
    if (loginLink) loginLink.style.display = "none";
    if (registerLink) registerLink.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-block";
    if (profileLink) profileLink.style.display = "inline-block";
    if (writeLink) writeLink.style.display = "flex";
    if (libraryLink) libraryLink.style.display = "inline-block";
  } else {
    if (userInfo) userInfo.textContent = "";
    if (userMenu) userMenu.style.display = "none";
    if (headerAvatar) headerAvatar.src = "";
    if (loginLink) loginLink.style.display = "inline-block";
    if (registerLink) registerLink.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "none";
    if (profileLink) profileLink.style.display = "none";
    if (writeLink) writeLink.style.display = "none";
    if (libraryLink) libraryLink.style.display = "none";
  }
};

// Logout handler
const handleLogout = () => {
  removeToken();
  removeUser();
  window.location.href = "/";
};

// Initialize auth UI on page load
document.addEventListener("DOMContentLoaded", () => {
  updateAuthUI();

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }
});
