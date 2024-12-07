const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  discount: {
    type: Number,
    required: true,
    min: 0,
  },
  type: {
    type: String,
    enum: ["percentage", "fixed", "free_shipping"],
  },
  description: {
    type: String,
    default: "",
    trim: true,
  },
  validFrom: {
    type: Date,
    required: true,
  },
  validUntil: {
    type: Date,
    required: true,
    validate: {
      validator: function (value) {
        return value > this.validFrom;
      },
      message: "Valid Until date must be after the Valid From date.",
    },
  },
  minPurchase: {
    type: Number,
    default: 0,
    min: 0,
  },
  usageLimit: {
    type: Number,
    default: 0,
    min: 0,
  },
  usagePerCustomer: {
    type: Number,
    default: 0,
    min: 0,
  },
  used: {
    type: Number,
    default: 0,
    min: 0,
  },
  applicableTo: {
    type: String,
    enum: ["All Products", "Specific Categories", "Specific Products"],
    required: true,
  },
  applicableCategories: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Category",
    default: [],
  },
  applicableProducts: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Product",
    default: [],
  },
  status: {
    type: String,
    enum: ["active", "expired", "scheduled"],
    default: "active",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;
