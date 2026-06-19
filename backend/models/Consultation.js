const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  chiefComplaint: { type: String, required: true, trim: true },
  history: String,
  examination: String,
  diagnosis: [String],
  medicines: [{
    name: String,
    dosage: String,
    frequency: String,
    duration: String,
  }],
  advice: String,
  followUpDate: Date,
  status: { type: String, enum: ['Draft', 'Signed'], default: 'Draft' },
  signedAt: Date,
}, { timestamps: true });

consultationSchema.index({ patientId: 1, createdAt: -1 });
consultationSchema.index({ doctorId: 1, createdAt: -1 });

module.exports = mongoose.model('Consultation', consultationSchema);
