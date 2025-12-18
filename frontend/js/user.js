// frontend/js/user.js

const API_URL = 'http://localhost:3000/api';
let userToken = null;
let currentUser = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Check if user is already logged in
  userToken = localStorage.getItem('userToken');
  if (userToken) {
    loadUserData();
  }
});

// Google Sign-In callback
function handleCredentialResponse(response) {
  const googleToken = response.credential;
  
  fetch(`${API_URL}/auth/google`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ token: googleToken })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      showMessage(data.error, 'error');
      return;
    }
    
    userToken = data.token;
    currentUser = data.user;
    localStorage.setItem('userToken', userToken);
    
    showMessage('Login successful!', 'success');
    showDashboard();
  })
  .catch(error => {
    console.error('Login error:', error);
    showMessage('Login failed. Please try again.', 'error');
  });
}

// Load user data from server
function loadUserData() {
  fetch(`${API_URL}/user/status`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      logout();
      return;
    }
    
    currentUser = data.user;
    showDashboard();
  })
  .catch(error => {
    console.error('Load user error:', error);
    logout();
  });
}

// Show dashboard based on user status
function showDashboard() {
  document.getElementById('landing-page').classList.remove('active');
  document.getElementById('dashboard-page').classList.add('active');
  
  // Update user info
  document.getElementById('user-name').textContent = currentUser.name;
  document.getElementById('user-email').textContent = currentUser.email;
  
  // Hide all status sections first
  document.querySelectorAll('.status-section').forEach(section => {
    section.classList.remove('active');
  });
  
  // Show appropriate section based on status
  switch(currentUser.status) {
    case 'NONE':
      if (!currentUser.codechefUsername) {
        document.getElementById('status-none').classList.add('active');
      } else {
        // Username submitted, waiting for submission ID
        document.getElementById('status-pending-submission').classList.add('active');
        document.getElementById('display-codechef').textContent = currentUser.codechefUsername;
        document.getElementById('verification-hex').textContent = currentUser.verificationHex;
      }
      break;
      
    case 'PENDING':
      document.getElementById('status-pending').classList.add('active');
      document.getElementById('pending-codechef').textContent = currentUser.codechefUsername;
      document.getElementById('pending-submission').textContent = currentUser.submissionId;
      break;
      
    case 'VERIFIED':
      document.getElementById('status-verified').classList.add('active');
      document.getElementById('verified-codechef').textContent = currentUser.codechefUsername;
      
      // Show password form or already-set message based on passwordSet flag
      if (currentUser.passwordSet) {
        document.getElementById('password-form').style.display = 'none';
        document.getElementById('password-already-set').style.display = 'block';
      } else {
        document.getElementById('password-form').style.display = 'block';
        document.getElementById('password-already-set').style.display = 'none';
      }
      break;
      
    case 'REJECTED':
      document.getElementById('status-rejected').classList.add('active');
      break;
  }
}

// Submit CodeChef username
function submitCodechefUsername() {
  if (!userToken) {
    showMessage('Please login first', 'error');
    return;
  }
  
  const username = document.getElementById('codechef-username').value.trim();
  
  if (!username) {
    showMessage('Please enter your CodeChef username', 'error');
    return;
  }
  
  fetch(`${API_URL}/user/submit-codechef`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    credentials: 'include',
    body: JSON.stringify({ codechefUsername: username })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      showMessage(data.error, 'error');
      return;
    }
    
    showMessage('Username saved! Please submit a solution.', 'success');
    loadUserData(); // Refresh to show next step
  })
  .catch(error => {
    console.error('Submit username error:', error);
    showMessage('Failed to submit username', 'error');
  });
}

// Submit solution ID
function submitSolutionId() {
  if (!userToken) {
    showMessage('Please login first', 'error');
    return;
  }
  
  const submissionId = document.getElementById('submission-id').value.trim();
  
  if (!submissionId) {
    showMessage('Please enter your submission ID', 'error');
    return;
  }
  
  fetch(`${API_URL}/user/submit-solution`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    credentials: 'include',
    body: JSON.stringify({ submissionId })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      showMessage(data.error, 'error');
      return;
    }
    
    showMessage('Submission received! Waiting for admin verification.', 'success');
    loadUserData(); // Refresh to show pending status
  })
  .catch(error => {
    console.error('Submit solution error:', error);
    showMessage('Failed to submit solution ID', 'error');
  });
}

// Copy verification code to clipboard
function copyVerificationCode() {
  const code = document.getElementById('verification-hex').textContent;
  navigator.clipboard.writeText(code).then(() => {
    showMessage('Verification code copied!', 'success');
  }).catch(() => {
    showMessage('Failed to copy code', 'error');
  });
}

// Refresh status
function refreshStatus() {
  showMessage('Refreshing...', 'info');
  loadUserData();
}

// Set password after verification
function setPassword() {
  if (!userToken) {
    showMessage('Please login first', 'error');
    return;
  }
  
  const password = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  
  if (!password || password.length < 6) {
    showMessage('Password must be at least 6 characters', 'error');
    return;
  }
  
  if (password !== confirmPassword) {
    showMessage('Passwords do not match', 'error');
    return;
  }
  
  fetch(`${API_URL}/user/set-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    credentials: 'include',
    body: JSON.stringify({ password })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      showMessage(data.error, 'error');
      return;
    }
    
    showMessage('Password set successfully!', 'success');
    document.getElementById('password-form').style.display = 'none';
    document.getElementById('password-already-set').style.display = 'block';
  })
  .catch(error => {
    console.error('Set password error:', error);
    showMessage('Failed to set password', 'error');
  });
}

// Change password (for already verified users)
function changePassword() {
  if (!userToken) {
    showMessage('Please login first', 'error');
    return;
  }
  
  const newPassword = document.getElementById('new-password-change').value;
  const confirmPassword = document.getElementById('confirm-password-change').value;
  
  if (!newPassword || !confirmPassword) {
    showMessage('Please fill in all password fields', 'error');
    return;
  }
  
  if (newPassword.length < 6) {
    showMessage('New password must be at least 6 characters', 'error');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    showMessage('Passwords do not match', 'error');
    return;
  }
  
  fetch(`${API_URL}/user/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    credentials: 'include',
    body: JSON.stringify({ newPassword })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      showMessage(data.error, 'error');
      return;
    }
    
    showMessage('Password changed successfully!', 'success');
    // Clear form
    document.getElementById('new-password-change').value = '';
    document.getElementById('confirm-password-change').value = '';
  })
  .catch(error => {
    console.error('Change password error:', error);
    showMessage('Failed to change password', 'error');
  });
}

// Delink CodeChef account
function delinkCodechef() {
  if (!userToken) {
    showMessage('Please login first', 'error');
    return;
  }
  
  if (!confirm('Are you sure you want to delink your CodeChef account? You will need to verify a new account to proceed.')) {
    return;
  }
  
  fetch(`${API_URL}/user/delink-codechef`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    credentials: 'include'
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      showMessage(data.error, 'error');
      return;
    }
    
    showMessage('CodeChef account delinked successfully!', 'success');
    loadUserData(); // Refresh to show updated state
  })
  .catch(error => {
    console.error('Delink error:', error);
    showMessage('Failed to delink CodeChef account', 'error');
  });
}

// Reset verification (appeal rejection)
function resetVerification() {
  if (!userToken) {
    showMessage('Please login first', 'error');
    return;
  }
  
  if (!confirm('This will reset your verification status and allow you to try again. Continue?')) {
    return;
  }
  
  fetch(`${API_URL}/user/reset-verification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    credentials: 'include'
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      showMessage(data.error, 'error');
      return;
    }
    
    showMessage('Verification reset! You can now try again with a different CodeChef ID.', 'success');
    loadUserData(); // Refresh to show updated state
  })
  .catch(error => {
    console.error('Reset verification error:', error);
    showMessage('Failed to reset verification', 'error');
  });
}

// Logout
function logout() {
  localStorage.removeItem('userToken');
  userToken = null;
  currentUser = null;
  
  document.getElementById('dashboard-page').classList.remove('active');
  document.getElementById('landing-page').classList.add('active');
  
  showMessage('Logged out successfully', 'info');
}

// Show message toast
function showMessage(text, type) {
  const messageEl = document.getElementById('message');
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.style.display = 'block';
  
  setTimeout(() => {
    messageEl.style.display = 'none';
  }, 4000);
}