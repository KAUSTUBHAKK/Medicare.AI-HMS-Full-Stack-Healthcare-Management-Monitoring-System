const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:      { type: String, required: true },
  dosage:    String,
  time:      { type: String, required: true },
  frequency: { type: String, default: 'Once daily' },
  notes:     String,
  active:    { type: Boolean, default: true },
  takenToday:{ type: Boolean, default: false },
  lastTaken: Date,
}, { timestamps: true });

module.exports = mongoose.model('Reminder', reminderSchema);
