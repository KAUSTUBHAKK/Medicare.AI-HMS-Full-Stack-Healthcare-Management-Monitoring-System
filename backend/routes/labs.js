const router = require('express').Router();
const LabReport = require('../models/LabReport');
const Consent = require('../models/Consent');
const { auth, clinicianOrAdmin } = require('../middleware/auth');
const { recordAudit } = require('../services/audit');

async function canView(patientId, user) {
  if (user.role === 'patient') return String(patientId) === String(user._id);
  if (user.role === 'admin') return true;
  const consent = await Consent.findOne({ patientId });
  return !consent || (consent.shareWithDoctors && consent.shareLabReports);
}

router.get('/', auth, async (req, res) => {
  try {
    const patientId = req.user.role === 'patient' ? req.user._id : req.query.patientId;
    if (!patientId) return res.status(400).json({ error: 'patientId is required' });
    if (!(await canView(patientId, req.user))) return res.status(403).json({ error: 'Patient has not shared lab reports' });
    const reports = await LabReport.find({ patientId })
      .sort({ collectedAt: -1 })
      .populate('patientId', 'name email age gender')
      .populate('uploadedBy reviewedBy', 'name role specialization');
    await recordAudit(req, { action: 'VIEW_LAB_REPORTS', patientId, resourceType: 'LabReport', detail: `${reports.length} report(s) viewed` });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const patientId = req.user.role === 'patient' ? req.user._id : req.body.patientId;
    if (!patientId) return res.status(400).json({ error: 'patientId is required' });
    if (req.user.role === 'doctor' && !(await canView(patientId, req.user))) {
      return res.status(403).json({ error: 'Patient has not shared lab reports' });
    }
    const report = await LabReport.create({
      patientId,
      uploadedBy: req.user._id,
      title: req.body.title || 'Laboratory Report',
      laboratory: req.body.laboratory,
      collectedAt: req.body.collectedAt || new Date(),
      rawText: req.body.rawText,
      results: req.body.results || [],
      warnings: req.body.warnings || [],
      source: req.body.source || 'manual',
      status: req.user.role === 'doctor' ? 'Reviewed' : 'Needs Review',
      reviewedBy: req.user.role === 'doctor' ? req.user._id : undefined,
      reviewedAt: req.user.role === 'doctor' ? new Date() : undefined,
    });
    await recordAudit(req, { action: 'CREATE_LAB_REPORT', patientId, resourceType: 'LabReport', resourceId: report._id, detail: report.title });
    res.status(201).json(report);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/:id/review', auth, clinicianOrAdmin, async (req, res) => {
  try {
    const report = await LabReport.findById(req.params.id);
    if (!report) return res.status(404).json({ error: 'Lab report not found' });
    if (!(await canView(report.patientId, req.user))) return res.status(403).json({ error: 'Patient has not shared lab reports' });
    report.status = 'Reviewed';
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();
    await report.save();
    await recordAudit(req, { action: 'REVIEW_LAB_REPORT', patientId: report.patientId, resourceType: 'LabReport', resourceId: report._id });
    res.json(report);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
