const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        name: { type: String, required: true },
      },
    ],
    deliveryAddress: {
      fullName: { type: String, required: true },
      mobile: { type: Number, required: true },
      pincode: { type: Number, required: true },
      state: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
    },
    paymentMethod: {
      type: String,
      enum: ["card", "upi", "cod", "razorpay"],
      default: "cod",
    },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Pending", "Shipped", "Delivered", "Cancelled", "Returned"],
      default: "Pending",
    },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Pending","Refunded","Unpaid"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
