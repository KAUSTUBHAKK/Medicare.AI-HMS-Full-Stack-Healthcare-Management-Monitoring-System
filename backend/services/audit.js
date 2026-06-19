const AuditLog = require('../models/AuditLog');

async function recordAudit(req, {
  action,
  patientId,
  resourceType = '',
  resourceId = '',
  detail = '',
}) {
  try {
    const recent = await AuditLog.findOne({
      actorId: req.user?._id,
      patientId: patientId || (req.user?.role === 'patient' ? req.user._id : undefined),
      action,
      resourceType,
      resourceId: resourceId ? String(resourceId) : '',
      createdAt: { $gte: new Date(Date.now() - 2000) },
    }).select('_id');
    if (recent) return recent;
    await AuditLog.create({
      actorId: req.user?._id,
      actorName: req.user?.name,
      actorRole: req.user?.role,
      patientId: patientId || (req.user?.role === 'patient' ? req.user._id : undefined),
      action,
      resourceType,
      resourceId: resourceId ? String(resourceId) : '',
      detail,
      ip: req.ip,
    });
  } catch (error) {
    console.error('Audit log error:', error.message);
  }
}

module.exports = { recordAudit };
