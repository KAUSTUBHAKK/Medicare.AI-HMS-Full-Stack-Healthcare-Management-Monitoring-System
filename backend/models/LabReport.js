const mongoose = require('mongoose');

const labResultSchema = new mongoose.Schema({
  test: { type: String, required: true },
  value: { type: Number, required: true },
  unit: String,
  reference: String,
  flag: { type: String, enum: ['Low', 'Normal', 'High'], default: 'Normal' },
}, { _id: false });

const labReportSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  laboratory: String,
  collectedAt: { type: Date, default: Date.now },
  rawText: String,
  results: [labResultSchema],
  warnings: [String],
  source: { type: String, enum: ['image-ocr', 'manual', 'seed'], default: 'manual' },
  status: { type: String, enum: ['Needs Review', 'Reviewed'], default: 'Needs Review' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
}, { timestamps: true });

labReportSchema.index({ patientId: 1, collectedAt: -1 });

module.exports = mongoose.model('LabReport', labReportSchema);
