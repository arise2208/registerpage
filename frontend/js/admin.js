// frontend/js/admin.js

const API_URL = 'http://localhost:3000/api';
let adminToken = null;
let currentTab = 'pending';

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  adminToken = localStorage.getItem('adminToken');
  if (adminToken) {
    showDashboard();
  }
});

// Admin login
function adminLogin() {
  const username = document.getElementById('admin-username').value;
  const password = document.getElementById('admin-password').value;
  
  if (!username || !password) {
    showMessage('Please enter username and password', 'error');
    return;
  }
  
  fetch(`${API_URL}/admin/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      showMessage(data.error, 'error');
      return;
    }
    
    adminToken = data.token;
    localStorage.setItem('adminToken', adminToken);
    
    showMessage('Login successful!', 'success');
    showDashboard();
  })
  .catch(error => {
    console.error('Login error:', error);
    showMessage('Login failed', 'error');
  });
}

// Show admin dashboard
function showDashboard() {
  document.getElementById('admin-login').classList.remove('active');
  document.getElementById('admin-dashboard').classList.add('active');
  
  loadVerificationRequests();
}

// Switch tabs
function switchTab(tab) {
  currentTab = tab;
  
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  if (tab === 'pending') {
    document.getElementById('pending-tab').classList.add('active');
    loadVerificationRequests();
  } else if (tab === 'verified') {
    document.getElementById('verified-tab').classList.add('active');
    loadVerifiedUsers();
  } else if (tab === 'all-users') {
    document.getElementById('all-users-tab').classList.add('active');
    loadAllUsers();
  } else if (tab === 'stats') {
    document.getElementById('stats-tab').classList.add('active');
    loadStatistics();
  }
}

// Load verification requests
function loadVerificationRequests() {
  fetch(`${API_URL}/admin/verification-requests`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      showMessage(data.error, 'error');
      return;
    }
    
    document.getElementById('pending-count').textContent = data.users.length;
    displayRequests(data.users, 'pending-requests', true);
  })
  .catch(error => {
    console.error('Load requests error:', error);
    showMessage('Failed to load requests', 'error');
  });
}

// Load verified users
function loadVerifiedUsers() {
  fetch(`${API_URL}/admin/verified-users`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      showMessage(data.error, 'error');
      return;
    }
    
    document.getElementById('verified-count').textContent = data.users.length;
    displayRequests(data.users, 'verified-users', false);
  })
  .catch(error => {
    console.error('Load verified users error:', error);
    showMessage('Failed to load verified users', 'error');
  });
}

// Display requests in the UI
function displayRequests(users, containerId, showActions) {
  const container = document.getElementById(containerId);
  
  if (users.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>📭</p>
        <p>No ${showActions ? 'pending' : 'verified'} requests</p>
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
        <div class="detail-item">
          <span class="detail-label">Google Email</span>
          <span class="detail-value">${user.email}</span>
        </div>
        
        <div class="detail-item">
          <span class="detail-label">Google ID</span>
          <span class="detail-value">${user.googleId}</span>
        </div>
        
        <div class="detail-item">
          <span class="detail-label">CodeChef Username</span>
          <span class="detail-value">${user.codechefUsername || 'N/A'}</span>
        </div>
        
        <div class="detail-item">
          <span class="detail-label">Submission ID</span>
          <span class="detail-value">${user.submissionId || 'N/A'}</span>
        </div>
      </div>
      
      ${user.verificationHex ? `
        <div class="detail-item" style="margin-top: 15px;">
          <span class="detail-label">Verification Hex (must be in submission code)</span>
          <div class="verification-code">${user.verificationHex}</div>
        </div>
      ` : ''}
      
      <div class="detail-item" style="margin-top: 10px;">
        <span class="detail-label">Submitted</span>
        <span class="detail-value">${new Date(user.updatedAt).toLocaleString()}</span>
      </div>
      
      ${showActions && user.status === 'PENDING' ? `
        <div class="request-actions">
          <button class="btn-verify" onclick="verifyUser('${user._id}')">
            ✅ Verify
          </button>
          <button class="btn-reject" onclick="rejectUser('${user._id}')">
            ❌ Reject
          </button>
        </div>
        <div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 6px; font-size: 0.9rem;">
          <strong>⚠️ Before verifying:</strong><br>
          1. Go to CodeChef submission: <code>https://www.codechef.com/viewsolution/${user.submissionId}</code><br>
          2. Check if submission owner matches: <strong>${user.codechefUsername}</strong><br>
          3. Check if verification hex appears in source code: <strong>${user.verificationHex}</strong>
        </div>
      ` : ''}
    </div>
  `).join('');
}

// Verify user
function verifyUser(userId) {
  if (!confirm('Are you sure you want to verify this user? Make sure you checked the CodeChef submission!')) {
    return;
  }
  
  fetch(`${API_URL}/admin/verify/${userId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      showMessage(data.error, 'error');
      return;
    }
    
    showMessage('User verified successfully!', 'success');
    loadVerificationRequests();
  })
  .catch(error => {
    console.error('Verify user error:', error);
    showMessage('Failed to verify user', 'error');
  });
}

// Reject user
function rejectUser(userId) {
  if (!confirm('Are you sure you want to reject this verification request?')) {
    return;
  }
  
  fetch(`${API_URL}/admin/reject/${userId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      showMessage(data.error, 'error');
      return;
    }
    
    showMessage('User verification rejected', 'info');
    loadVerificationRequests();
  })
  .catch(error => {
    console.error('Reject user error:', error);
    showMessage('Failed to reject user', 'error');
  });
}

// Admin logout
function adminLogout() {
  localStorage.removeItem('adminToken');
  adminToken = null;
  
  document.getElementById('admin-dashboard').classList.remove('active');
  document.getElementById('admin-login').classList.add('active');
  
  showMessage('Logged out successfully', 'info');
}

// Load all users
function loadAllUsers() {
  fetch(`${API_URL}/admin/all-users`, {
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      showMessage(data.error, 'error');
      return;
    }
    
    displayAllUsers(data.users);
  })
  .catch(error => {
    console.error('Load all users error:', error);
    showMessage('Failed to load users', 'error');
  });
}

// Search users
function searchUsers() {
  const search = document.getElementById('search-input').value.trim();
  
  if (!search) {
    showMessage('Please enter a search term', 'error');
    return;
  }
  
  fetch(`${API_URL}/admin/all-users?search=${encodeURIComponent(search)}`, {
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      showMessage(data.error, 'error');
      return;
    }
    
    displayAllUsers(data.users);
  })
  .catch(error => {
    console.error('Search error:', error);
    showMessage('Failed to search users', 'error');
  });
}

// Display all users
function displayAllUsers(users) {
  const container = document.getElementById('all-users');
  
  if (users.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>📭</p>
        <p>No users found</p>
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
        <div class="detail-item">
          <span class="detail-label">Email</span>
          <span class="detail-value">${user.email}</span>
        </div>
        
        <div class="detail-item">
          <span class="detail-label">CodeChef Username</span>
          <span class="detail-value">${user.codechefUsername || 'Not set'}</span>
        </div>
        
        <div class="detail-item">
          <span class="detail-label">Status</span>
          <span class="detail-value">${user.status}</span>
        </div>
        
        <div class="detail-item">
          <span class="detail-label">Password Set</span>
          <span class="detail-value">${user.passwordSet ? '✅ Yes' : '❌ No'}</span>
        </div>
        
        <div class="detail-item">
          <span class="detail-label">Created</span>
          <span class="detail-value">${new Date(user.createdAt).toLocaleString()}</span>
        </div>
      </div>
      
      <div class="request-actions">
        ${user.status === 'VERIFIED' ? `
          <button class="btn-reject" onclick="revokeUser('${user._id}')">
            ⛔ Revoke
          </button>
        ` : ''}
        ${user.status !== 'VERIFIED' ? `
          <button class="btn-danger" onclick="deleteUser('${user._id}')">
            🗑️ Delete
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

// Load statistics
function loadStatistics() {
  fetch(`${API_URL}/admin/stats`, {
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      showMessage(data.error, 'error');
      return;
    }
    
    displayStatistics(data);
  })
  .catch(error => {
    console.error('Load stats error:', error);
    showMessage('Failed to load statistics', 'error');
  });
}

// Display statistics
function displayStatistics(stats) {
  const container = document.getElementById('stats-content');
  
  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: '👥' },
    { label: 'Verified', value: stats.verifiedUsers, icon: '✅' },
    { label: 'Pending', value: stats.pendingUsers, icon: '⏳' },
    { label: 'Rejected', value: stats.rejectedUsers, icon: '❌' },
    { label: 'Not Started', value: stats.noneUsers, icon: '📝' },
    { label: 'Password Set', value: stats.passwordSetUsers, icon: '🔐' }
  ];
  
  container.innerHTML = statCards.map(stat => `
    <div style="background: #f8f9fa; border: 2px solid #e0e0e0; border-radius: 8px; padding: 20px; text-align: center;">
      <div style="font-size: 2rem; margin-bottom: 10px;">${stat.icon}</div>
      <div style="color: #667eea; font-size: 1.8rem; font-weight: bold; margin-bottom: 5px;">${stat.value}</div>
      <div style="color: #666;">${stat.label}</div>
    </div>
  `).join('');
}

// Revoke user verification
function revokeUser(userId) {
  if (!confirm('Are you sure you want to revoke this user\'s verification?')) {
    return;
  }
  
  fetch(`${API_URL}/admin/revoke/${userId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      showMessage(data.error, 'error');
      return;
    }
    
    showMessage('User verification revoked', 'success');
    loadAllUsers();
  })
  .catch(error => {
    console.error('Revoke error:', error);
    showMessage('Failed to revoke user', 'error');
  });
}

// Delete user
function deleteUser(userId) {
  if (!confirm('Are you sure you want to permanently delete this user? This cannot be undone.')) {
    return;
  }
  
  fetch(`${API_URL}/admin/delete/${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      showMessage(data.error, 'error');
      return;
    }
    
    showMessage('User deleted successfully', 'success');
    loadAllUsers();
  })
  .catch(error => {
    console.error('Delete error:', error);
    showMessage('Failed to delete user', 'error');
  });
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