// frontend/js/admin.js

const API_URL = "http://localhost:3000/api";
let currentTab = "pending";

/* ================================
   Init
================================ */
document.addEventListener("DOMContentLoaded", () => {
  // Always start on login screen
  showLogin();
});

/* ================================
   Admin Login
================================ */
function adminLogin() {
  const username = document.getElementById("admin-username").value.trim();
  const password = document.getElementById("admin-password").value.trim();

  if (!username || !password) {
    showMessage("Please enter username and password", "error");
    return;
  }

  fetch(`${API_URL}/admin/login`, {
    method: "POST",
    credentials: "include", // 👈 REQUIRED
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        showMessage(data.error, "error");
        return;
      }

      showMessage("Login successful!", "success");
      showDashboard();
    })
    .catch(() => {
      showMessage("Login failed", "error");
    });
}

/* ================================
   UI Navigation
================================ */
function showLogin() {
  document.getElementById("admin-dashboard").classList.remove("active");
  document.getElementById("admin-login").classList.add("active");
}

function showDashboard() {
  document.getElementById("admin-login").classList.remove("active");
  document.getElementById("admin-dashboard").classList.add("active");
  loadVerificationRequests();
}

function switchTab(tab, el) {

  currentTab = tab;

  document.querySelectorAll(".tab-btn").forEach(btn =>
    btn.classList.remove("active")
  );
  el.classList.add("active");


  document.querySelectorAll(".tab-content").forEach(c =>
    c.classList.remove("active")
  );

  if (tab === "pending") {
    document.getElementById("pending-tab").classList.add("active");
    loadVerificationRequests();
  } else if (tab === "verified") {
    document.getElementById("verified-tab").classList.add("active");
    loadVerifiedUsers();
  } else if (tab === "all-users") {
    document.getElementById("all-users-tab").classList.add("active");
    loadAllUsers();
  } else if (tab === "stats") {
    document.getElementById("stats-tab").classList.add("active");
    loadStatistics();
  }
}

/* ================================
   Fetch Helpers
================================ */
function apiFetch(url, options = {}) {
  return fetch(url, {
    credentials: "include", // 👈 COOKIE SENT HERE
    ...options
  }).then(res => res.json());
}

/* ================================
   Load Data
================================ */
function loadVerificationRequests() {
  apiFetch(`${API_URL}/admin/verification-requests`)
    .then(data => {
      if (data.error) return showMessage(data.error, "error");
      document.getElementById("pending-count").textContent = data.users.length;
      displayRequests(data.users, "pending-requests", true);
    })
    .catch(() => showMessage("Failed to load requests", "error"));
}

function loadVerifiedUsers() {
  apiFetch(`${API_URL}/admin/verified-users`)
    .then(data => {
      if (data.error) return showMessage(data.error, "error");
      document.getElementById("verified-count").textContent = data.users.length;
      displayRequests(data.users, "verified-users", false);
    })
    .catch(() => showMessage("Failed to load verified users", "error"));
}

function loadAllUsers() {
  apiFetch(`${API_URL}/admin/all-users`)
    .then(data => {
      if (data.error) return showMessage(data.error, "error");
      displayAllUsers(data.users);
    })
    .catch(() => showMessage("Failed to load users", "error"));
}

function loadStatistics() {
  apiFetch(`${API_URL}/admin/stats`)
    .then(data => {
      if (data.error) return showMessage(data.error, "error");
      displayStatistics(data);
    })
    .catch(() => showMessage("Failed to load stats", "error"));
}

/* ================================
   Actions
================================ */
function verifyUser(id) {
  if (!confirm("Verify this user?")) return;

  apiFetch(`${API_URL}/admin/verify/${id}`, { method: "POST" })
    .then(data => {
      if (data.error) return showMessage(data.error, "error");
      showMessage("User verified", "success");
      loadVerificationRequests();
    });
}

function rejectUser(id) {
  if (!confirm("Reject this user?")) return;

  apiFetch(`${API_URL}/admin/reject/${id}`, { method: "POST" })
    .then(data => {
      if (data.error) return showMessage(data.error, "error");
      showMessage("User rejected", "info");
      loadVerificationRequests();
    });
}

function revokeUser(id) {
  if (!confirm("Revoke verification?")) return;

  apiFetch(`${API_URL}/admin/revoke/${id}`, { method: "POST" })
    .then(data => {
      if (data.error) return showMessage(data.error, "error");
      showMessage("Verification revoked", "success");
      loadAllUsers();
    });
}

function deleteUser(id) {
  if (!confirm("Delete user permanently?")) return;

  apiFetch(`${API_URL}/admin/delete/${id}`, { method: "DELETE" })
    .then(data => {
      if (data.error) return showMessage(data.error, "error");
      showMessage("User deleted", "success");
      loadAllUsers();
    });
}



function displayRequests(users, containerId, showActions) {
  const container = document.getElementById(containerId);

  if (!users || users.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>📭</p>
        <p>No requests found</p>
      </div>
    `;
    return;
  }

  container.innerHTML = users.map(user => `
    <div class="request-card">
      <div class="request-header">
        <h3>${user.name}</h3>
        <span class="status-badge ${user.status.toLowerCase()}">${user.status}</span>
      </div>

      <div class="request-details">
        <div><strong>Email:</strong> ${user.email}</div>
        <div><strong>CodeChef:</strong> ${user.codechefUsername || "N/A"}</div>
        <div><strong>Submission:</strong> ${user.submissionId || "N/A"}</div>
      </div>

      ${showActions && user.status === "PENDING" ? `
        <div class="request-actions">
          <button onclick="verifyUser('${user._id}')">✅ Verify</button>
          <button onclick="rejectUser('${user._id}')">❌ Reject</button>
        </div>
      ` : ""}
    </div>
  `).join("");
}


function displayAllUsers(users) {
  const container = document.getElementById("all-users");

  if (!users || users.length === 0) {
    container.innerHTML = "<p>No users found</p>";
    return;
  }

  container.innerHTML = users.map(user => `
    <div class="request-card">
      <h3>${user.name}</h3>
      <p>Email: ${user.email}</p>
      <p>Status: ${user.status}</p>

      ${user.status === "VERIFIED" ? `
        <button onclick="revokeUser('${user._id}')">⛔ Revoke</button>
      ` : `
        <button onclick="deleteUser('${user._id}')">🗑️ Delete</button>
      `}
    </div>
  `).join("");
}


function displayStatistics(stats) {
  const container = document.getElementById("stats-content");

  container.innerHTML = `
    <div>👥 Total Users: ${stats.totalUsers}</div>
    <div>✅ Verified: ${stats.verifiedUsers}</div>
    <div>⏳ Pending: ${stats.pendingUsers}</div>
    <div>❌ Rejected: ${stats.rejectedUsers}</div>
    <div>📝 Not Started: ${stats.noneUsers}</div>
    <div>🔐 Password Set: ${stats.passwordSetUsers}</div>
  `;
}




/* ================================
   Logout
================================ */
function adminLogout() {
  apiFetch(`${API_URL}/admin/logout`, { method: "POST" })
    .finally(() => {
      showMessage("Logged out", "info");
      showLogin();
    });
}

/* ================================
   UI Helpers
================================ */
function showMessage(text, type) {
  const el = document.getElementById("message");
  el.textContent = text;
  el.className = `message ${type}`;
  el.style.display = "block";
  setTimeout(() => (el.style.display = "none"), 4000);
}
