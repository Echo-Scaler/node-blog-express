document.addEventListener("DOMContentLoaded", () => {
  // Optional: Preload if needed, but usually we load on open
});

let selectedMedia = null;
let mediaPage = 1;
let mediaLimit = 24; // Increased for grid
let mediaLoading = false;
let mediaTotalPages = 1;
let dragCounter = 0;

function openMediaLibrary() {
  const modal = document.getElementById("mediaLibraryModal");
  modal.classList.add("active"); // Use active class for opacity transition
  modal.classList.remove("hidden"); // Remove hidden if present from old logic

  // Always load library immediately
  if (document.getElementById("media-grid").children.length === 0) {
    loadMedia(1);
  }

  document.body.style.overflow = "hidden";
}

function closeMediaLibrary() {
  const modal = document.getElementById("mediaLibraryModal");
  modal.classList.remove("active");
  setTimeout(() => {
    // modal.classList.add("hidden"); // Optional if using pure CSS opacity
  }, 300);
  document.body.style.overflow = "auto";
}

// --- Drag & Drop Logic (Unified) ---

function handleDragOver(event) {
  event.preventDefault();
  event.stopPropagation();
  event.dataTransfer.dropEffect = "copy";

  // Show overlay
  const overlay = document.getElementById("drag-overlay");
  if (overlay) overlay.classList.remove("hidden");
}

function handleDragLeave(event) {
  event.preventDefault();
  event.stopPropagation();

  // Simple check: if we left the container
  // (This can be flaky with child elements, often better to use a counter)
  const overlay = document.getElementById("drag-overlay");
  // if(overlay) overlay.classList.add("hidden");
}

// We need a better way to handle drag enter/leave to avoid flickering
// Using a counter approach or sticking to drop
// For now, let's keep it simple: DragOver shows it. Drop hides it.
// To actually hide it on leave requires checking relatedTarget.

function handleDrop(event) {
  event.preventDefault();
  event.stopPropagation();

  const overlay = document.getElementById("drag-overlay");
  if (overlay) overlay.classList.add("hidden");

  const files = event.dataTransfer.files;
  handleFileUpload(files);
}

// --- Upload Logic ---

function handleFileUpload(files) {
  if (files.length === 0) return;

  const file = files[0];
  const formData = new FormData();
  formData.append("file", file);

  const progressBar = document.getElementById("upload-progress");
  const progressBarInner = progressBar.querySelector("div");
  progressBar.classList.remove("hidden");
  progressBarInner.style.width = "0%";

  const token = localStorage.getItem("token") || "";

  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/api/media", true);

  const tokenElement = document.querySelector('meta[name="csrf-token"]');
  if (tokenElement) {
    xhr.setRequestHeader("X-CSRF-Token", tokenElement.content);
  }
  if (token) {
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
  }

  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const percentComplete = (e.loaded / e.total) * 100;
      progressBarInner.style.width = percentComplete + "%";
    }
  };

  xhr.onload = () => {
    progressBarInner.style.width = "100%";
    if (xhr.status === 201) {
      setTimeout(() => {
        progressBar.classList.add("hidden");
        progressBarInner.style.width = "0%";
        loadMedia(1); // Reload grid to show new file
      }, 500);
    } else {
      alert("Upload failed: " + xhr.responseText);
      progressBar.classList.add("hidden");
    }
  };

  xhr.onerror = () => {
    alert("Upload failed due to network error.");
    progressBar.classList.add("hidden");
  };

  xhr.send(formData);
}

// --- Library Logic ---

async function loadMedia(page = 1) {
  if (mediaLoading) return;
  mediaLoading = true;

  const loadingEl = document.getElementById("library-loading");
  const grid = document.getElementById("media-grid");
  const emptyState = document.getElementById("empty-state");
  const loadMoreBtn = document.getElementById("load-more-btn");

  loadingEl.classList.remove("hidden");
  loadMoreBtn.classList.add("hidden");
  if (page === 1) emptyState.classList.add("hidden");

  try {
    const token = localStorage.getItem("token");
    const headers = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(
      `/api/media?page=${page}&limit=${mediaLimit}`,
      { headers },
    );
    const data = await response.json();

    if (data.success) {
      if (page === 1) grid.innerHTML = "";

      if (data.media.length === 0 && page === 1) {
        emptyState.classList.remove("hidden");
      }

      data.media.forEach((item) => {
        const div = document.createElement("div");
        div.className = "media-item";
        div.onclick = () => selectMedia(item, div);

        if (item.type === "image") {
          div.innerHTML = `
            <img src="${item.url}" alt="${item.altText || ""}" loading="lazy">
            <div class="media-item-info">${item.originalName}</div>
          `;
        } else {
          let icon =
            '<svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>';
          div.innerHTML = `
            <div class="flex items-center justify-center h-full bg-gray-100">${icon}</div>
            <div class="media-item-info">${item.originalName}</div>
          `;
        }
        grid.appendChild(div);
      });

      mediaPage = data.pagination.page;
      mediaTotalPages = data.pagination.pages;

      if (mediaPage < mediaTotalPages) {
        loadMoreBtn.classList.remove("hidden");
        loadMoreBtn.onclick = () => loadMedia(mediaPage + 1);
      }
    }
  } catch (error) {
    console.error("Error loading media:", error);
  } finally {
    mediaLoading = false;
    loadingEl.classList.add("hidden");
  }
}

function selectMedia(item, element) {
  selectedMedia = item;

  // Highlight selection
  const grid = document.getElementById("media-grid");
  Array.from(grid.children).forEach((child) =>
    child.classList.remove("selected"),
  );
  element.classList.add("selected");

  // Show details
  const details = document.getElementById("media-details");
  details.classList.add("active"); // Use active class for sidebar logic
  details.classList.remove("hidden"); // Ensure it's visible

  document.getElementById("detail-filename").textContent = item.originalName;
  document.getElementById("detail-type").textContent = item.type;
  document.getElementById("detail-url").value =
    window.location.origin + item.url;
  document.getElementById("detail-alt").value = item.altText || "";

  const preview = document.getElementById("selected-media-preview");
  if (item.type === "image") {
    preview.innerHTML = `<img src="${item.url}" class="object-contain w-full h-full max-h-full">`;
  } else {
    preview.innerHTML = `<div class="h-20 w-20 bg-gray-200 flex items-center justify-center rounded text-gray-500 font-bold">${item.type.toUpperCase()}</div>`;
  }
}

async function saveAltText() {
  if (!selectedMedia) return;
  const newAlt = document.getElementById("detail-alt").value;
  // ... (Keep existing fetch logic)
  try {
    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`/api/media/${selectedMedia._id}`, {
      method: "PUT",
      headers: headers,
      body: JSON.stringify({ altText: newAlt }),
    });

    if (response.ok) {
      selectedMedia.altText = newAlt;
      alert("Saved!");
    } else {
      alert("Failed to save");
    }
  } catch (e) {
    console.error(e);
    alert("Error");
  }
}

function copyUrl() {
  const urlField = document.getElementById("detail-url");
  urlField.select();
  document.execCommand("copy");
  // alert("Copied!"); // Optional feedback
}

async function deleteSelectedMedia() {
  if (!selectedMedia) return;
  if (!confirm("Delete this file permanently?")) return;

  try {
    const token = localStorage.getItem("token");
    const headers = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`/api/media/${selectedMedia._id}`, {
      method: "DELETE",
      headers: headers,
    });

    if (response.ok) {
      selectedMedia = null;
      document.getElementById("media-details").classList.remove("active");
      document.getElementById("media-details").classList.add("hidden");
      loadMedia(1);
    } else {
      alert("Failed to delete");
    }
  } catch (e) {
    console.error(e);
    alert("Error deleting media");
  }
}

function insertSelectedMedia() {
  if (!selectedMedia) return;

  const contentTextarea = document.getElementById("content");
  if (contentTextarea) {
    let markdown = "";
    if (selectedMedia.type === "image") {
      markdown = `![${selectedMedia.altText || selectedMedia.originalName}](${selectedMedia.url})`;
    } else {
      markdown = `[${selectedMedia.originalName}](${selectedMedia.url})`;
    }

    const start = contentTextarea.selectionStart;
    const end = contentTextarea.selectionEnd;
    const text = contentTextarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    contentTextarea.value = before + markdown + after;
    contentTextarea.selectionStart = contentTextarea.selectionEnd =
      start + markdown.length;
    contentTextarea.focus();

    closeMediaLibrary();
  }
}
