const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  jid: { type: String, required: true, unique: true },
  name: { type: String },
  commands_used: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);