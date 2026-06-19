const mongoose = require('mongoose');

const vitalSchema = new mongoose.Schema({
  patientId:  { type: String, required: true },
  patientName:String,
  hr:         Number,
  bp_s:       Number,
  bp_d:       Number,
  bp:         String,
  spo2:       Number,
  temp:       Number,
  rr:         Number,
  glucose:    Number,
  recordedAt: { type: Date, default: Date.now },
}, { timestamps: true });

vitalSchema.index({ patientId: 1, recordedAt: -1 });
module.exports = mongoose.model('Vital', vitalSchema);
