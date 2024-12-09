const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ["Category", "Product"], required: true },
    categoryOrProduct: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "type",
      required: true,
    },
    discountType: {
      type: String,
      enum: ["Percentage", "Fixed Amount"],
      required: false,
    },
    discountValue: { type: Number, required: true },
    minPurchase: { type: Number, default: null },
    startDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value instanceof Date && !isNaN(value);
        },
        message: "Invalid Start Date",
      },
    },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return this.startDate && value > this.startDate;
        },
        message: "End Date must be after Start Date",
      },
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Scheduled"],
      default: "Scheduled",
    },
    description: { type: String },
  },
  { timestamps: true }
);

offerSchema.pre("save", function (next) {
  if (this.endDate <= this.startDate) {
    const err = new Error("End Date must be after Start Date");
    next(err);
  } else {
    next();
  }
});

module.exports = mongoose.model("Offer", offerSchema);
