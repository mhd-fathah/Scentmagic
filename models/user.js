const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  googleId: { type: String, unique: true },
  firstName: { type: String },
  lastName: { type: String },
  name: { type: String },
  email: { type: String, required: true, unique: true },
  mobile: { type: Number },
  gender: { type: String, enum: ["Male", "Female", "Other"], default: "Male" },
  password: { type: String },
  addresses: [
    {
      type: { type: String },
      fullName: { type: String },
      mobile : { type: Number },
      pincode : {type : Number},
      state : {type : String},
      address : {type : String},
      city:{type : String},
    },
  ],
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  isBlocked: { type: Boolean, default: false },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
