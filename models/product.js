const mongoose = require("mongoose");
const Review = require("../models/review");

const productSchema = new mongoose.Schema(
  {
    product_name: { type: String, required: true },
    shortDescription: { type: String, required: true },
    longDescription: { type: String },
    regular_price: { type: Number, required: true },
    discount_price: { type: Number, required: true },
    previous_discount_price: { type: Number },
    totalDiscounts: { type: Number },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    netQuantity: { type: String },
    stock_status: { type: String, required: true },
    product_images: [String],
    highlights: { type: String },
    isDeleted: { type: Boolean, default: false },
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
    reviewsCount: { type: Number, default: 0 },
    quantity: { type: String },
    salesPackage: { type: String },
    leftStock: { type: Number, required: true },
    extra_offer_percentage: { type: Number, default: 0 },
    coupon: {  
      type: String, 
      default: "", 
    },
  },
  { timestamps: true } 
);

productSchema.virtual("total_discount_price").get(function () {
  if (this.regular_price && this.discount_price) {
    const extraDiscount =
      (this.discount_price * this.extra_offer_percentage) / 100;
    return Math.round(this.discount_price - extraDiscount);
  }
  return this.discount_price;
});

productSchema.pre("save", function (next) {
  if (this.discount_price > this.regular_price) {
    return next(
      new Error("Discount price cannot be greater than the regular price")
    );
  }
  next();
});

productSchema.statics.updateReviewsCount = async function (productId) {
  const count = await Review.countDocuments({ product: productId });
  await this.findByIdAndUpdate(productId, { reviewsCount: count });
};

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
