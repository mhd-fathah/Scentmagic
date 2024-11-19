const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  product_name: { type: String, required: true },
  description: { type: String, required: true },
  regular_price: { type: Number, required: true },
  discount_price: { type: Number, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  quantity: { type: Number, required: true },
  stock_status: { type: String, required: true },
  product_images: [String],  
  isDeleted: { type: Boolean, default: false } 
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
