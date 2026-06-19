const router = require('express').Router();
const Appointment = require('../models/Appointment');
const { auth, doctorOnly } = require('../middleware/auth');

// GET all appointments (clinicians/admin see all, patient sees own)
router.get('/', auth, async (req, res) => {
  try {
    const q = ['doctor', 'admin'].includes(req.user.role) ? {} : { patientId: req.user._id };
    const apts = await Appointment.find(q).sort({ date: -1 }).limit(200);
    res.json(apts);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET booked slots for a given date + specialist
router.get('/slots', auth, async (req, res) => {
  try {
    const { date, specialistId } = req.query;
    const start = new Date(date); start.setHours(0,0,0,0);
    const end   = new Date(date); end.setHours(23,59,59,999);
    const apts = await Appointment.find({ specialistId, date: { $gte: start, $lte: end }, status: { $ne: 'Cancelled' } });
    res.json(apts.map(a => a.slot));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST create appointment
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ error: 'Patient account required to create an appointment' });
    }
    const apt = await Appointment.create({ ...req.body, patientId: req.user._id });
    // Real-time notify doctors
    req.app.get('io').to('doctors').emit('appointment:new', apt);
    res.status(201).json(apt);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// PATCH update status
router.patch('/:id', auth, async (req, res) => {
  try {
    const existing = await Appointment.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Appointment not found' });
    const isOwner = String(existing.patientId) === String(req.user._id);
    const isClinician = ['doctor', 'admin'].includes(req.user.role);
    if (!isOwner && !isClinician) return res.status(403).json({ error: 'Not allowed' });
    if (!isClinician) {
      const requestedKeys = Object.keys(req.body || {});
      if (requestedKeys.some(key => key !== 'status') || req.body.status !== 'Cancelled') {
        return res.status(403).json({ error: 'Patients may only cancel their own appointment' });
      }
    }
    const apt = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    req.app.get('io').to('doctors').emit('appointment:updated', apt);
    res.json(apt);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// DELETE cancel
router.delete('/:id', auth, async (req, res) => {
  try {
    const existing = await Appointment.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Appointment not found' });
    const isOwner = String(existing.patientId) === String(req.user._id);
    const isClinician = ['doctor', 'admin'].includes(req.user.role);
    if (!isOwner && !isClinician) return res.status(403).json({ error: 'Not allowed' });
    await Appointment.findByIdAndUpdate(req.params.id, { status: 'Cancelled' }, { runValidators: true });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// GET stats for dashboard
router.get('/stats', auth, async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
    const scope = ['doctor', 'admin'].includes(req.user.role) ? {} : { patientId: req.user._id };
    const [total, todayCount, upcoming, byStatus] = await Promise.all([
      Appointment.countDocuments(scope),
      Appointment.countDocuments({ ...scope, date: { $gte: today, $lt: tomorrow } }),
      Appointment.countDocuments({ ...scope, date: { $gte: now }, status: { $in: ['Scheduled', 'Confirmed'] } }),
      Appointment.aggregate([
        { $match: scope },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);
    res.json({ total, todayCount, upcoming, byStatus });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
