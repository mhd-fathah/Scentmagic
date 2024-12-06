const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true, // Ensure the coupon code is unique
    trim: true,
  },
  discount: {
    type: Number, // Represents the discount amount
    required: true,
    min: 0, // Ensures discount cannot be negative
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed', 'free_shipping'], // Matches your dropdown values
  },
  description: {
    type: String,
    default: '',
    trim: true, // Removes unnecessary spaces
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
        return value > this.validFrom; // Ensures validUntil is after validFrom
      },
      message: 'Valid Until date must be after the Valid From date.',
    },
  },
  minPurchase: {
    type: Number,
    default: 0, // No minimum purchase required by default
    min: 0, // Prevents negative values
  },
  usageLimit: {
    type: Number,
    default: 0, // 0 means unlimited usage
    min: 0, // Ensures positive values
  },
  usagePerCustomer: {
    type: Number,
    default: 0, // 0 means unlimited usage per customer
    min: 0,
  },
  used: {
    type: Number,
    default: 0, // Tracks the number of times the coupon is used
    min: 0,
  },
  applicableTo: {
    type: String,
    enum: ['All Products', 'Specific Categories', 'Specific Products'], // Matches your form options
    required: true,
  },
  applicableCategories: {
    type: [mongoose.Schema.Types.ObjectId], // Store references to category IDs
    ref: 'Category',
    default: [], // Empty array for "All Products"
  },
  applicableProducts: {
    type: [mongoose.Schema.Types.ObjectId], // Store references to product IDs
    ref: 'Product',
    default: [], // Empty array for "All Products"
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'scheduled'], // Defines possible coupon states
    default: 'active',
  },
  createdAt: {
    type: Date,
    default: Date.now, // Automatically sets the creation date
  },
});

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
