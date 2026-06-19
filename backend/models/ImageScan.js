const mongoose = require('mongoose');

const imageScanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: String,
  topCondition: String,
  confidence: Number,
  results: [{
    id: String,
    name: String,
    confidence: Number,
    advice: String,
  }],
  features: Object,
  imageMeta: {
    source: String,
    width: Number,
    height: Number,
  },
  status: { type: String, enum: ['Patient Saved', 'Needs Review', 'Reviewed'], default: 'Patient Saved' },
  doctorNote: String,
}, { timestamps: true });

imageScanSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ImageScan', imageScanSchema);

