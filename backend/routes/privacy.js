const router = require('express').Router();
const Consent = require('../models/Consent');
const AuditLog = require('../models/AuditLog');
const { auth } = require('../middleware/auth');
const { recordAudit } = require('../services/audit');

router.get('/consent', auth, async (req, res) => {
  if (req.user.role !== 'patient') return res.status(403).json({ error: 'Patient account required' });
  const consent = await Consent.findOneAndUpdate(
    { patientId: req.user._id },
    { $setOnInsert: { patientId: req.user._id } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.json(consent);
});

router.put('/consent', auth, async (req, res) => {
  try {
    if (req.user.role !== 'patient') return res.status(403).json({ error: 'Patient account required' });
    const allowed = ['shareWithDoctors', 'shareLabReports', 'shareImageScans', 'allowEmergencyAccess', 'researchUse'];
    const update = Object.fromEntries(allowed.filter(key => typeof req.body[key] === 'boolean').map(key => [key, req.body[key]]));
    const consent = await Consent.findOneAndUpdate(
      { patientId: req.user._id },
      { ...update, patientId: req.user._id },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await recordAudit(req, { action: 'UPDATE_CONSENT', patientId: req.user._id, resourceType: 'Consent', resourceId: consent._id });
    res.json(consent);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/audit', auth, async (req, res) => {
  try {
    if (req.user.role === 'doctor') return res.status(403).json({ error: 'Patients can view their own audit history; administrators can review system logs' });
    const query = req.user.role === 'patient' ? { patientId: req.user._id } : {};
    const logs = await AuditLog.find(query).select('-ip').sort({ createdAt: -1 }).limit(200);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
