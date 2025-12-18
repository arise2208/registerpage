const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticateAdmin } = require('../middleware/auth');

// Admin login (simple username/password)
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Simple hardcoded admin check (can be made more sophisticated)
    if (username === process.env.ADMIN_USERNAME && 
        password === process.env.ADMIN_PASSWORD) {
      
      const token = jwt.sign(
        { isAdmin: true, userId: null, tokenVersion: 0 },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ token, message: 'Admin login successful' });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }

  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all verification requests
router.get('/verification-requests', authenticateAdmin, async (req, res) => {
  try {
    const users = await User.find({
      status: { $in: ['PENDING', 'REJECTED'] }
    }).select('-password').sort({ updatedAt: -1 });

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all verified users
router.get('/verified-users', authenticateAdmin, async (req, res) => {
  try {
    const users = await User.find({
      status: 'VERIFIED'
    }).select('-password').sort({ updatedAt: -1 });

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify user (admin manually checks CodeChef submission)
router.post('/verify/:userId', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.status !== 'PENDING') {
      return res.status(400).json({ error: 'User not in pending state' });
    }

    // Check if CodeChef username is already verified by another user
    const existingVerified = await User.findOne({
      codechefUsername: user.codechefUsername,
      status: 'VERIFIED',
      _id: { $ne: userId }
    });

    if (existingVerified) {
      return res.status(400).json({ 
        error: 'This CodeChef username is already verified by another user' 
      });
    }

    user.status = 'VERIFIED';
    user.updatedAt = new Date();
    await user.save();

    res.json({ 
      message: 'User verified successfully',
      user: {
        id: user._id,
        email: user.email,
        codechefUsername: user.codechefUsername
      }
    });

  } catch (error) {
    console.error('Verify user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reject user
router.post('/reject/:userId', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.status !== 'PENDING') {
      return res.status(400).json({ error: 'User not in pending state' });
    }

    user.status = 'REJECTED';
    user.updatedAt = new Date();
    await user.save();

    res.json({ message: 'User verification rejected' });

  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users with optional filters
router.get('/all-users', authenticateAdmin, async (req, res) => {
  try {
    const { status, search } = req.query;
    
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { codechefUsername: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json({ users, count: users.length });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user details
router.get('/user/:userId', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get statistics
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ status: 'VERIFIED' });
    const pendingUsers = await User.countDocuments({ status: 'PENDING' });
    const rejectedUsers = await User.countDocuments({ status: 'REJECTED' });
    const noneUsers = await User.countDocuments({ status: 'NONE' });
    const passwordSetUsers = await User.countDocuments({ passwordSet: true });
    
    res.json({
      totalUsers,
      verifiedUsers,
      pendingUsers,
      rejectedUsers,
      noneUsers,
      passwordSetUsers
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Revoke verification (un-verify a user)
router.post('/revoke/:userId', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.status !== 'VERIFIED') {
      return res.status(400).json({ error: 'User is not verified' });
    }
    
    // Reset verification but keep CodeChef username for reference
    user.status = 'REJECTED';
    user.verificationHex = null;
    user.submissionId = null;
    user.updatedAt = new Date();
    
    await user.save();
    
    res.json({
      message: `User verification revoked${reason ? ': ' + reason : ''}`,
      user: {
        id: user._id,
        email: user.email,
        codechefUsername: user.codechefUsername,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Revoke verification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete verification request (remove user entirely)
router.delete('/delete/:userId', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Only allow deletion of non-verified users
    if (user.status === 'VERIFIED') {
      return res.status(400).json({ 
        error: 'Cannot delete verified users. Use "Revoke" instead.' 
      });
    }
    
    await User.findByIdAndDelete(userId);
    
    res.json({
      message: 'User deleted successfully',
      deletedUser: {
        id: user._id,
        email: user.email,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;