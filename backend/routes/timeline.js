const router = require('express').Router();
const Appointment = require('../models/Appointment');
const Reminder = require('../models/Reminder');
const Chat = require('../models/Chat');
const ImageScan = require('../models/ImageScan');
const Report = require('../models/Report');
const LabReport = require('../models/LabReport');
const Consultation = require('../models/Consultation');
const { auth } = require('../middleware/auth');

function safeText(value, fallback = 'Record saved') {
  return String(value || fallback).trim();
}

function safeDate(primary, fallback) {
  const candidate = primary || fallback || new Date();
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function item(type, title, body, date, meta = {}) {
  return {
    type,
    title: safeText(title, 'Medical record'),
    body: safeText(body, 'Record saved in Medicare.AI'),
    date: safeDate(date).toISOString(),
    meta,
  };
}

router.get('/', auth, async (req, res) => {
  try {
    const userId = req.query.userId && ['doctor', 'admin'].includes(req.user.role) ? req.query.userId : req.user._id;
    const [appointments, reminders, chats, scans, reports, labs, consultations] = await Promise.all([
      Appointment.find({ patientId: userId }).sort({ createdAt: -1 }).limit(50),
      Reminder.find({ userId }).sort({ createdAt: -1 }).limit(50),
      Chat.find({ userId }).sort({ createdAt: -1 }).limit(60),
      ImageScan.find({ userId }).sort({ createdAt: -1 }).limit(50),
      Report.find({ userId }).sort({ createdAt: -1 }).limit(50),
      LabReport.find({ patientId: userId }).sort({ collectedAt: -1 }).limit(50),
      Consultation.find({ patientId: userId, status: 'Signed' }).sort({ createdAt: -1 }).limit(50).populate('doctorId', 'name specialization'),
    ]);

    const events = [
      ...appointments.map(a => item(
        'appointment',
        `${safeText(a.specialist, 'Doctor')} appointment`,
        `${safeText(a.status, 'Scheduled')} - ${safeText(a.problem, 'Consultation')}`,
        a.createdAt || a.date,
        { date: safeDate(a.date, a.createdAt).toISOString(), slot: safeText(a.slot, 'Slot pending') }
      )),
      ...reminders.map(r => item(
        'medicine',
        `Medicine reminder: ${safeText(r.name, 'Medicine')}`,
        `${safeText(r.dosage, 'Dose as prescribed')} - ${safeText(r.time, 'Time pending')} - ${safeText(r.frequency, 'Once daily')}`,
        r.createdAt,
        { active: Boolean(r.active), takenToday: Boolean(r.takenToday) }
      )),
      ...chats
        .filter(c => c.role === 'assistant')
        .map(c => item('chat', 'AI health chat response', safeText(c.content).slice(0, 180), c.createdAt)),
      ...scans.map(s => item(
        'image-scan',
        `Image scan: ${safeText(s.topCondition, 'Visual check')}`,
        `${Number(s.confidence || 0)}% confidence - ${safeText(s.status, 'Saved')}`,
        s.createdAt,
        { results: Array.isArray(s.results) ? s.results.slice(0, 3) : [] }
      )),
      ...reports.map(r => item(
        'report',
        r.title,
        `${safeText(r.reportType, 'Report')} - ${safeText(r.riskLevel, 'Low')} risk`,
        r.createdAt,
        { summary: safeText(r.summary, 'Report generated') }
      )),
      ...labs.map(r => item(
        'lab',
        r.title,
        `${r.results?.length || 0} values - ${safeText(r.status, 'Needs Review')}`,
        r.collectedAt || r.createdAt,
        { results: Array.isArray(r.results) ? r.results.slice(0, 8) : [] }
      )),
      ...consultations.map(c => item(
        'consultation',
        `Consultation with ${safeText(c.doctorId?.name, 'Doctor')}`,
        `${safeText(c.chiefComplaint, 'Clinical visit')} - ${c.diagnosis?.join(', ') || 'Assessment recorded'}`,
        c.signedAt || c.createdAt,
        { advice: safeText(c.advice, 'Follow clinician advice'), followUpDate: c.followUpDate }
      )),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(events);
  } catch (e) {
    console.error('Timeline error:', e);
    res.status(500).json({ error: 'Could not load timeline records right now.' });
  }
});

module.exports = router;
