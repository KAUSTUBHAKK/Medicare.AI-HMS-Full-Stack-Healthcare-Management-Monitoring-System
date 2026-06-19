const router = require('express').Router();
const Consultation = require('../models/Consultation');
const Consent = require('../models/Consent');
const { auth, doctorOnly } = require('../middleware/auth');
const { recordAudit } = require('../services/audit');

router.get('/', auth, async (req, res) => {
  try {
    const query = req.user.role === 'patient'
      ? { patientId: req.user._id, status: 'Signed' }
      : req.query.patientId ? { patientId: req.query.patientId } : { doctorId: req.user._id };
    if (req.user.role === 'doctor' && req.query.patientId) {
      const consent = await Consent.findOne({ patientId: req.query.patientId });
      if (consent && !consent.shareWithDoctors) return res.status(403).json({ error: 'Patient has disabled doctor access' });
    }
    const rows = await Consultation.find(query)
      .sort({ createdAt: -1 })
      .populate('patientId', 'name email age gender phone')
      .populate('doctorId', 'name specialization');
    const patientId = req.user.role === 'patient' ? req.user._id : req.query.patientId;
    await recordAudit(req, { action: 'VIEW_CONSULTATIONS', patientId, resourceType: 'Consultation', detail: `${rows.length} consultation(s) viewed` });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', auth, doctorOnly, async (req, res) => {
  try {
    const consent = await Consent.findOne({ patientId: req.body.patientId });
    if (consent && !consent.shareWithDoctors) return res.status(403).json({ error: 'Patient has disabled doctor access' });
    const consultation = await Consultation.create({ ...req.body, doctorId: req.user._id });
    await recordAudit(req, { action: 'CREATE_CONSULTATION', patientId: consultation.patientId, resourceType: 'Consultation', resourceId: consultation._id });
    res.status(201).json(consultation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/:id', auth, doctorOnly, async (req, res) => {
  try {
    const consultation = await Consultation.findOne({ _id: req.params.id, doctorId: req.user._id });
    if (!consultation) return res.status(404).json({ error: 'Consultation not found' });
    if (consultation.status === 'Signed') return res.status(409).json({ error: 'Signed consultations cannot be edited' });
    Object.assign(consultation, req.body);
    if (req.body.status === 'Signed') consultation.signedAt = new Date();
    await consultation.save();
    await recordAudit(req, {
      action: consultation.status === 'Signed' ? 'SIGN_CONSULTATION' : 'UPDATE_CONSULTATION',
      patientId: consultation.patientId,
      resourceType: 'Consultation',
      resourceId: consultation._id,
    });
    res.json(consultation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
