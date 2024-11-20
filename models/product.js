const mongoose = require("mongoose");
const Review = require('../models/review')

const productSchema = new mongoose.Schema({
  product_name: { type: String, required: true },
  shortDescription: { type: String, required: true },
  longDescription: { type: String },
  regular_price: { type: Number, required: true },
  discount_price: { type: Number, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  netQuantity: { type: String },
  stock_status: { type: String, required: true },
  product_images: [String],  
  highlights: { type: String },
  isDeleted: { type: Boolean, default: false },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
  reviewsCount: { type: Number, default: 0 },
  quantity:{type:String},
  salesPackage:{type:String},
  leftStock : {type : Number, required : true}

});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
