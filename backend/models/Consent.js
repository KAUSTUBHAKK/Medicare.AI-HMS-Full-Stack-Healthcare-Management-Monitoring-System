const mongoose = require('mongoose');

const consentSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  shareWithDoctors: { type: Boolean, default: true },
  shareLabReports: { type: Boolean, default: true },
  shareImageScans: { type: Boolean, default: true },
  allowEmergencyAccess: { type: Boolean, default: true },
  researchUse: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Consent', consentSchema);
