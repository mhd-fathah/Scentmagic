const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    referralCode: { type: String },
    status: { type: String, default: "Active" },
    totalReferrals: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    pendingRewards: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now },
  });
  

module.exports = mongoose.model('Referral', referralSchema);
