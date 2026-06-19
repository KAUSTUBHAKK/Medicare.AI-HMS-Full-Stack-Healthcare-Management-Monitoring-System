const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: String,
  title: { type: String, required: true },
  reportType: { type: String, default: 'AI Doctor Report' },
  summary: String,
  riskLevel: { type: String, enum: ['Low', 'Moderate', 'High', 'Emergency'], default: 'Low' },
  sections: Object,
  generatedBy: { type: String, default: 'MediCare AI' },
}, { timestamps: true });

reportSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);

