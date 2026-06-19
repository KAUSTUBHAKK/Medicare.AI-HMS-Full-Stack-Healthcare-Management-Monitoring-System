const router = require('express').Router();
const Report = require('../models/Report');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const query = ['doctor', 'admin'].includes(req.user.role) ? {} : { userId: req.user._id };
    const reports = await Report.find(query).sort({ createdAt: -1 }).limit(200).populate('userId', 'name email age gender phone');
    res.json(reports);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const report = await Report.create({
      ...req.body,
      userId: req.user._id,
      patientName: req.user.name,
    });
    res.status(201).json(report);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

module.exports = router;

