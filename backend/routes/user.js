const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { authenticateUser } = require('../middleware/auth');

// Get user status
router.get('/status', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit CodeChef username (generates verification hex)
router.post('/submit-codechef', authenticateUser, async (req, res) => {
  try {
    const { codechefUsername } = req.body;

    if (!codechefUsername) {
      return res.status(400).json({ error: 'CodeChef username is required' });
    }

    const user = await User.findById(req.userId);

    // Check if user already has a verified account
    if (user.status === 'VERIFIED') {
      return res.status(400).json({ error: 'Account already verified' });
    }

    // Check if user already has a pending request
    if (user.status === 'PENDING') {
      return res.status(400).json({ error: 'Verification already pending' });
    }

    // Check if CodeChef username is already claimed by another user
    const existingUser = await User.findOne({ 
      codechefUsername, 
      status: 'VERIFIED' 
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: 'This CodeChef username is already verified by another account' 
      });
    }

    // Generate random verification hex (16 bytes = 32 hex chars)
    const verificationHex = crypto.randomBytes(16).toString('hex');

    user.codechefUsername = codechefUsername;
    user.verificationHex = verificationHex;
    user.status = 'NONE'; // Not pending until submission ID is provided
    user.updatedAt = new Date();

    await user.save();

    res.json({
      message: 'CodeChef username saved. Please submit your solution.',
      verificationHex,
      codechefUsername
    });

  } catch (error) {
    console.error('Submit CodeChef error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit submission ID
router.post('/submit-solution', authenticateUser, async (req, res) => {
  try {
    const { submissionId } = req.body;

    if (!submissionId) {
      return res.status(400).json({ error: 'Submission ID is required' });
    }

    const user = await User.findById(req.userId);

    if (!user.codechefUsername || !user.verificationHex) {
      return res.status(400).json({ 
        error: 'Please submit CodeChef username first' 
      });
    }

    if (user.status === 'VERIFIED') {
      return res.status(400).json({ error: 'Account already verified' });
    }

    user.submissionId = submissionId;
    user.status = 'PENDING';
    user.updatedAt = new Date();

    await user.save();

    res.json({
      message: 'Submission ID saved. Waiting for admin verification.',
      status: 'PENDING'
    });

  } catch (error) {
    console.error('Submit solution error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Set password (only after verification)
router.post('/set-password', authenticateUser, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters' 
      });
    }

    const user = await User.findById(req.userId);

    if (user.status !== 'VERIFIED') {
      return res.status(400).json({ 
        error: 'Account must be verified before setting password' 
      });
    }

    // Hash password - NEVER store plain text
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.passwordSet = true;
    user.updatedAt = new Date();

    await user.save();

    res.json({ message: 'Password set successfully' });

  } catch (error) {
    console.error('Set password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Change password (only for verified users)
router.post('/change-password', authenticateUser, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'New password must be at least 6 characters' 
      });
    }

    const user = await User.findById(req.userId);

    if (user.status !== 'VERIFIED') {
      return res.status(400).json({ 
        error: 'Account must be verified before changing password' 
      });
    }

    if (!user.password) {
      return res.status(400).json({ 
        error: 'No password set. Please set a password first.' 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.passwordSet = true;
    user.updatedAt = new Date();

    await user.save();

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delink CodeChef username
router.post('/delink-codechef', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user.codechefUsername) {
      return res.status(400).json({ 
        error: 'No CodeChef account linked' 
      });
    }

    // Reset verification fields
    user.codechefUsername = null;
    user.verificationHex = null;
    user.submissionId = null;
    user.status = 'NONE';
    user.updatedAt = new Date();

    await user.save();

    res.json({ 
      message: 'CodeChef account delinked successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
        codechefUsername: user.codechefUsername
      }
    });

  } catch (error) {
    console.error('Delink CodeChef error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset verification (appeal rejection - try again)
router.post('/reset-verification', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (user.status !== 'REJECTED') {
      return res.status(400).json({ 
        error: 'Only rejected verification can be reset' 
      });
    }

    // Reset verification fields to allow reapplication
    user.codechefUsername = null;
    user.verificationHex = null;
    user.submissionId = null;
    user.status = 'NONE';
    user.updatedAt = new Date();

    await user.save();

    res.json({ 
      message: 'Verification reset. You can now try again with the same or different CodeChef username.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
        codechefUsername: user.codechefUsername
      }
    });

  } catch (error) {
    console.error('Reset verification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Forgot password - send reset link
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if email exists (security)
      return res.status(200).json({ 
        message: 'If email exists in our system, you will receive a password reset link' 
      });
    }

    if (user.status !== 'VERIFIED') {
      return res.status(400).json({ 
        error: 'Account must be verified to reset password. Please complete verification first.' 
      });
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = await bcrypt.hash(resetToken, 10);
    const resetTokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hour

    user.passwordResetToken = resetTokenHash;
    user.passwordResetExpiry = resetTokenExpiry;
    await user.save();

    // In production, send email with reset link
    // For now, return the token in response (in production, this would be a secret link sent via email)
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5500'}/reset-password.html?token=${resetToken}&email=${encodeURIComponent(email)}`;

    res.json({
      message: 'Password reset link generated',
      resetLink, // Only for development - in production, send via email
      note: 'In production, a reset link would be sent to your email'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ error: 'Email, reset token, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: 'Invalid reset request' });
    }

    // Check if token is expired
    if (!user.passwordResetExpiry || Date.now() > user.passwordResetExpiry) {
      return res.status(401).json({ error: 'Reset link has expired. Please request a new one.' });
    }

    // Verify reset token
    const isTokenValid = await bcrypt.compare(resetToken, user.passwordResetToken);
    if (!isTokenValid) {
      return res.status(401).json({ error: 'Invalid reset token' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.passwordSet = true;
    user.passwordResetToken = null;
    user.passwordResetExpiry = null;
    user.updatedAt = new Date();

    await user.save();

    res.json({ message: 'Password reset successfully. You can now login with your new password.' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;