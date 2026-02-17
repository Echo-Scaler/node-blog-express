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

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
};

// Update UI based on auth status
const updateAuthUI = () => {
  const user = getUser();
  const userInfo = document.getElementById("user-info");
  const loginLink = document.getElementById("login-link");
  const registerLink = document.getElementById("register-link");
  const logoutBtn = document.getElementById("logout-btn");

  if (user && userInfo) {
    userInfo.textContent = `Hello, ${user.displayName || user.username}!`;
    if (loginLink) loginLink.style.display = "none";
    if (registerLink) registerLink.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-block";
  } else {
    if (userInfo) userInfo.textContent = "";
    if (loginLink) loginLink.style.display = "inline-block";
    if (registerLink) registerLink.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "none";
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
