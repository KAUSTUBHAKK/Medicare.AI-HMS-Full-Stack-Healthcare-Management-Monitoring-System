const router = require('express').Router();
const ImageScan = require('../models/ImageScan');
const { auth, clinicianOrAdmin } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const query = ['doctor', 'admin'].includes(req.user.role) ? {} : { userId: req.user._id };
    const scans = await ImageScan.find(query).sort({ createdAt: -1 }).limit(200).populate('userId', 'name email age gender phone');
    res.json(scans);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const scan = await ImageScan.create({
      ...req.body,
      userId: req.user._id,
      patientName: req.user.name,
      status: req.body.confidence >= 70 ? 'Needs Review' : 'Patient Saved',
    });
    req.app.get('io')?.to('doctors').emit('scan:new', scan);
    res.status(201).json(scan);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.patch('/:id/review', auth, clinicianOrAdmin, async (req, res) => {
  try {
    const scan = await ImageScan.findByIdAndUpdate(
      req.params.id,
      { status: 'Reviewed', doctorNote: req.body.doctorNote || '' },
      { new: true }
    );
    res.json(scan);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

module.exports = router;

