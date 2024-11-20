const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  googleId: { type: String, unique: true }, // Google Authentication ID
  name: { type: String }, // User's full name
  email: { type: String, required: true, unique: true }, // User's email address
  mobile: { type: Number }, // User's mobile number
  password: { type: String }, // User's hashed password
  resetPasswordToken: { type: String }, // Token for resetting password
  resetPasswordExpires: { type: Date }, // Expiry time for the reset token
  isBlocked: { type: Boolean, default: false }, // Block status for the user
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }], // References to user's reviews
  createdAt: { type: Date, default: Date.now }, // Creation date
  updatedAt: { type: Date, default: Date.now }, // Last updated date
});

module.exports = mongoose.model("User", userSchema);
