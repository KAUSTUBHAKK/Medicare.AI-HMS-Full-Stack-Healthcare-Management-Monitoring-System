const router = require('express').Router();
const Vital = require('../models/Vital');
const { auth, doctorOnly } = require('../middleware/auth');

// Save a batch of vitals (called by server's simulation or manual entry)
router.post('/batch', auth, doctorOnly, async (req, res) => {
  try {
    const { vitals } = req.body; // array
    await Vital.insertMany(vitals);
    res.json({ saved: vitals.length });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Get history for a specific patient
router.get('/:patientId', auth, doctorOnly, async (req, res) => {
  try {
    const records = await Vital.find({ patientId: req.params.patientId })
      .sort({ recordedAt: -1 }).limit(100);
    res.json(records);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get latest vitals summary for all ICU patients
router.get('/', auth, doctorOnly, async (req, res) => {
  try {
    const ICU_IDS = ['p1','p2','p3','p4','p5','p6','p7','p8','p9','p10','p11','p12'];
    const results = await Promise.all(ICU_IDS.map(id =>
      Vital.findOne({ patientId: id }).sort({ recordedAt: -1 })
    ));
    res.json(results.filter(Boolean));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
