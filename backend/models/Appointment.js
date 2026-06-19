const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patientName:  { type: String, required: true },
  patientId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  doctorId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  age:          Number,
  phone:        String,
  specialist:   { type: String, required: true },
  specialistId: String,
  problem:      { type: String, required: true },
  date:         { type: Date,   required: true },
  slot:         { type: String, required: true },
  status:       { type: String, enum: ['Scheduled','Confirmed','Completed','Cancelled'], default: 'Scheduled' },
  notes:        String,
}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);
