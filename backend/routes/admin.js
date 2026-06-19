const router = require('express').Router();
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Reminder = require('../models/Reminder');
const ImageScan = require('../models/ImageScan');
const Report = require('../models/Report');
const { auth, adminOnly } = require('../middleware/auth');

router.get('/overview', auth, adminOnly, async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [
      users,
      appointments,
      activeReminders,
      scans,
      reports,
      recentScans,
      recentUsers,
      recentAppointments,
      todayAppointments,
      pendingScans,
      appointmentStatus,
      dailyActivity,
    ] = await Promise.all([
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Appointment.countDocuments(),
      Reminder.countDocuments({ active: true }),
      ImageScan.countDocuments(),
      Report.countDocuments(),
      ImageScan.find().sort({ createdAt: -1 }).limit(8).populate('userId', 'name email'),
      User.find().sort({ createdAt: -1 }).limit(8).select('-password'),
      Appointment.find().sort({ createdAt: -1 }).limit(10).populate('patientId', 'name email').populate('doctorId', 'name specialization'),
      Appointment.countDocuments({ date: { $gte: startOfToday, $lt: endOfToday } }),
      ImageScan.countDocuments({ status: 'Needs Review' }),
      Appointment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Appointment.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        } },
        { $sort: { _id: 1 } },
      ]),
    ]);
    const roleCounts = users.reduce((acc, x) => ({ ...acc, [x._id]: x.count }), {});
    const systemChecks = [
      { name: 'MongoDB Atlas', status: 'Operational', tone: 'green' },
      { name: 'Authentication', status: 'Operational', tone: 'green' },
      { name: 'Appointment API', status: 'Operational', tone: 'green' },
      { name: 'AI scan review queue', status: pendingScans > 0 ? `${pendingScans} pending` : 'Clear', tone: pendingScans > 0 ? 'yellow' : 'green' },
    ];

    res.json({
      roleCounts,
      appointments,
      activeReminders,
      scans,
      reports,
      recentScans,
      recentUsers,
      recentAppointments,
      todayAppointments,
      pendingScans,
      appointmentStatus,
      dailyActivity,
      systemChecks,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/users', auth, adminOnly, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).select('-password').limit(200);
    res.json(users);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/users', auth, adminOnly, async (req, res) => {
  try {
    const { name, email, password, role, phone, specialization } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and temporary password are required' });
    if (!['patient', 'doctor', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid account role' });
    if (await User.findOne({ email: email.toLowerCase() })) return res.status(400).json({ error: 'Email already registered' });
    const user = await User.create({ name, email: email.toLowerCase(), password, role, phone, specialization, active: true });
    res.status(201).json({ id:user._id, name:user.name, email:user.email, role:user.role, active:user.active });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.patch('/users/:id/status', auth, adminOnly, async (req, res) => {
  try {
    if (String(req.user._id) === req.params.id) return res.status(400).json({ error: 'You cannot deactivate your own admin account' });
    const user = await User.findByIdAndUpdate(req.params.id, { active: Boolean(req.body.active) }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

module.exports = router;
