const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role:     { type: String, enum: ['user', 'assistant'], required: true },
  content:  { type: String, required: true },
  session:  String,
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);
