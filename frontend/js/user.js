// frontend/js/user.js

const API_URL = "http://localhost:3000/api";
let currentUser = null;

/* ================================
   Init
================================ */
document.addEventListener("DOMContentLoaded", () => {
  loadUserData();
});

/* ================================
   Google Sign-In callback
================================ */
function handleCredentialResponse(response) {
  const googleToken = response.credential;

  fetch(`${API_URL}/auth/google`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ token: googleToken })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        showMessage(data.error, "error");
        return;
      }

      currentUser = data.user;
      showMessage("Login successful!", "success");
      showDashboard();
    })
    .catch(() => {
      showMessage("Login failed. Please try again.", "error");
    });
}

/* ================================
   Load user data (SESSION CHECK)
================================ */
function loadUserData() {
  fetch(`${API_URL}/user/status`, {
    method: "GET",
    credentials: "include"
  })
    .then(res => {
      if (!res.ok) throw new Error("Not logged in");
      return res.json();
    })
    .then(data => {
      if (!data.user) return;
      currentUser = data.user;
      showDashboard();
    })
    .catch(() => {
      showLanding();
    });
}

/* ================================
   UI Navigation
================================ */
function showLanding() {
  document.getElementById("dashboard-page")?.classList.remove("active");
  document.getElementById("landing-page")?.classList.add("active");
}

function showDashboard() {
  document.getElementById("landing-page")?.classList.remove("active");
  document.getElementById("dashboard-page")?.classList.add("active");

  document.getElementById("user-name").textContent = currentUser.name;
  document.getElementById("user-email").textContent = currentUser.email;

  document.querySelectorAll(".status-section").forEach(sec =>
    sec.classList.remove("active")
  );

  switch (currentUser.status) {
    case "NONE":
      if (!currentUser.codechefUsername) {
        document.getElementById("status-none").classList.add("active");
      } else {
        document.getElementById("status-pending-submission").classList.add("active");
        document.getElementById("display-codechef").textContent =
          currentUser.codechefUsername;
        document.getElementById("verification-hex").textContent =
          currentUser.verificationHex;
      }
      break;

    case "PENDING":
      document.getElementById("status-pending").classList.add("active");
      document.getElementById("pending-codechef").textContent =
        currentUser.codechefUsername;
      document.getElementById("pending-submission").textContent =
        currentUser.submissionId;
      break;

    case "VERIFIED":
      document.getElementById("status-verified").classList.add("active");
      document.getElementById("verified-codechef").textContent =
        currentUser.codechefUsername;

      if (currentUser.passwordSet) {
        document.getElementById("password-form").style.display = "none";
        document.getElementById("password-already-set").style.display = "block";
      } else {
        document.getElementById("password-form").style.display = "block";
        document.getElementById("password-already-set").style.display = "none";
      }
      break;

    case "REJECTED":
      document.getElementById("status-rejected").classList.add("active");
      break;
  }
}

/* ================================
   User Actions
================================ */
function submitCodechefUsername() {
  const username = document.getElementById("codechef-username").value.trim();
  if (!username) return showMessage("Enter CodeChef username", "error");

  fetch(`${API_URL}/user/submit-codechef`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ codechefUsername: username })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) return showMessage(data.error, "error");
      showMessage("Username saved!", "success");
      loadUserData();
    });
}

function submitSolutionId() {
  const submissionId = document.getElementById("submission-id").value.trim();
  if (!submissionId) return showMessage("Enter submission ID", "error");

  fetch(`${API_URL}/user/submit-solution`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ submissionId })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) return showMessage(data.error, "error");
      showMessage("Submission sent!", "success");
      loadUserData();
    });
}

function setPassword() {
  const password = document.getElementById("new-password").value;
  const confirm = document.getElementById("confirm-password").value;

  if (password !== confirm || password.length < 6) {
    return showMessage("Invalid password", "error");
  }

  fetch(`${API_URL}/user/set-password`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) return showMessage(data.error, "error");
      showMessage("Password set!", "success");
      loadUserData();
    });
}

/* ================================
   🔄 FIXED MISSING FUNCTIONS
================================ */
function refreshStatus() {
  loadUserData();
}

function resetVerification() {
  fetch(`${API_URL}/user/reset-verification`, {
    method: "POST",
    credentials: "include"
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        return showMessage(data.error, "error");
      }
      showMessage("Verification reset successfully!", "success");
      loadUserData();
    })
    .catch(() => {
      showMessage("Failed to reset verification", "error");
    });
}

/* ================================
   Logout
================================ */
function logout() {
  fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    credentials: "include"
  }).finally(() => {
    location.reload();
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
