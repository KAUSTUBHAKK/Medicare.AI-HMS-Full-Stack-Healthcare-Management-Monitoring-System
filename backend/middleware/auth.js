const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ error: 'User not found' });
    if (req.user.active === false) return res.status(403).json({ error: 'Account is inactive' });
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const doctorOnly = (req, res, next) => {
  if (req.user?.role !== 'doctor') return res.status(403).json({ error: 'Doctors only' });
  next();
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
  next();
};

const clinicianOrAdmin = (req, res, next) => {
  if (!['doctor', 'admin'].includes(req.user?.role)) return res.status(403).json({ error: 'Clinician/admin only' });
  next();
};

module.exports = { auth, doctorOnly, adminOnly, clinicianOrAdmin };
