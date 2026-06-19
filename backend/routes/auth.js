const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const { auth } = require('../middleware/auth');

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, age, gender, phone } = req.body;
    if (await User.findOne({ email })) return res.status(400).json({ error: 'Email already registered' });
    const role = 'patient';
    const user = await User.create({ name, email, password, role, age, gender, phone });
    res.status(201).json({ token: sign(user._id), user: { id: user._id, name, email, role } });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ error: 'Invalid email or password' });
    if (user.active === false) return res.status(403).json({ error: 'Account is inactive. Contact the hospital administrator.' });
    res.json({ token: sign(user._id), user: { id: user._id, name: user.name, email, role: user.role, specialization: user.specialization } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
