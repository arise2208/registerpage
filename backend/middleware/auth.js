const jwt = require('jsonwebtoken');

/* ================================
   User Authentication
================================ */
exports.authenticateUser = (req, res, next) => {
  let token = req.cookies?.accessToken;

  if (!token && req.headers.authorization) {
    const [type, value] = req.headers.authorization.split(' ');
    if (type === 'Bearer') token = value;
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.userId = payload.userId;
    req.tokenVersion = payload.tokenVersion;
    req.isAdmin = payload.isAdmin;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

/* ================================
   Admin Authentication
================================ */
exports.authenticateAdmin = (req, res, next) => {
  let token = req.cookies?.accessToken;

  if (!token && req.headers.authorization) {
    const [type, value] = req.headers.authorization.split(' ');
    if (type === 'Bearer') token = value;
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    if (!payload.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    req.isAdmin = true;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
