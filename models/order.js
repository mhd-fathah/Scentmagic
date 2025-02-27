const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cancellationReason: {
      type: String,
    },
    cancellationComment: {
      type: String,
    },
    returnReason: {
      type: String,
    },
    returnComment: {
      type: String,
    },
    returnRequested: { type: Boolean, default: false },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        name: {
          type: String,
          required: true,
        },
      },
    ],
    deliveryAddress: {
      fullName: {
        type: String,
        required: true,
      },
      mobile: {
        type: Number,
        required: true,
        minlength: 10,
        maxlength: 10,
      },
      pincode: {
        type: Number,
        required: true,
        minlength: 6,
        maxlength: 6,
      },
      state: {
        type: String,
        required: true,
      },
      address: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
    },
    paymentMethod: {
      type: String,
      enum: ["card", "upi", "cod", "razorpay"],
      default: "cod",
    },
    razorpayPaymentId: {
      type: String,
      required: false,
    },
    razorpayOrderId: {
      type: String,
      required: false,
    },
    razorpayPaymentStatus: {
      type: String,
      enum: ["success", "failure", "pending","Refunded"],
      default: "failure",
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    totalDiscounts: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCoupons: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["Pending", "Shipped", "Delivered", "Cancelled", "Returned", "Return Requested"],
      default: "Pending",
    },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Pending", "Refunded", "Unpaid", "Failed"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
