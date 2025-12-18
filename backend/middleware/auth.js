const jwt = require('jsonwebtoken');

exports.authenticateUser = (req, res, next) => {
  // Get token from Authorization header or cookies
  let token = req.cookies.accessToken;
  
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }
  
  if (!token) return res.status(401).json({ error: 'Unauthenticated' });

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.userId = payload.userId;
    req.tokenVersion = payload.tokenVersion;
    req.isAdmin = payload.isAdmin;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

exports.authenticateAdmin = (req, res, next) => {
  // Get token from Authorization header or cookies
  let token = req.cookies.accessToken;
  
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }
  
  if (!token) return res.status(401).json({ error: 'Unauthenticated' });

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    if (!payload.isAdmin) return res.status(403).json({ error: 'Forbidden' });
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
