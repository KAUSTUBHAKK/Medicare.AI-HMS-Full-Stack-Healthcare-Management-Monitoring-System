const router = require('express').Router();
const Reminder = require('../models/Reminder');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const reminders = await Reminder.find({ userId: req.user._id, active: true });
    res.json(reminders);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const r = await Reminder.create({ ...req.body, userId: req.user._id });
    res.status(201).json(r);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.patch('/:id/taken', auth, async (req, res) => {
  try {
    const r = await Reminder.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { takenToday: !req.body.takenToday, lastTaken: new Date() },
      { new: true }
    );
    res.json(r);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await Reminder.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { active: false });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

module.exports = router;
