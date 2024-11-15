const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: { type: String, unique: true },
  name: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String }, 
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
});

module.exports = mongoose.model('User', userSchema);