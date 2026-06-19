const router = require('express').Router();
const User = require('../models/User');
const { auth, doctorOnly } = require('../middleware/auth');

router.get('/', auth, doctorOnly, async (req, res) => {
  try {
    const patients = await User.find({ role: 'patient' }).select('-password');
    res.json(patients);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
