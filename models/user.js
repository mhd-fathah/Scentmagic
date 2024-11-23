const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  googleId: { type: String, unique: true },
  name: { type: String },
  email: { type: String, required: true, unique: true },
  mobile: { type: Number },
  password: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  isBlocked: { type: Boolean, default: false },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
