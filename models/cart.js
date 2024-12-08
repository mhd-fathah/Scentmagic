const mongoose = require("mongoose");
const Product = require("./product");

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: { type: Number, required: true, default: 1 },
  deliveryDate: { type: String, required: true },
});

const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [cartItemSchema],
  totalPrice: { type: Number, required: true, default: 0 },
  couponCode: { type: String, default: null },  // New field for the applied coupon code
  createdAt: { type: Date, default: Date.now },
});

cartSchema.methods.calculateTotalPrice = function () {
  this.totalPrice = this.items.reduce(async (total, item) => {
    const product = await Product.findById(item.productId);
    const itemTotal = product.discount_price * item.quantity;
    return total + itemTotal;
  }, 0);
};

cartSchema.pre("save", async function (next) {
  await this.calculateTotalPrice();
  next();
});

module.exports = mongoose.model("Cart", cartSchema);
