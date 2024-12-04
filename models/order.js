const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderSchema = new mongoose.Schema(
  {
    orderId: { 
      type: String, 
      required: true, 
      unique: true 
    },
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
        quantity: { 
          type: Number, 
          required: true, 
          min: 1 
        },
        price: { 
          type: Number, 
          required: true, 
          min: 0 
        },
        name: { 
          type: String, 
          required: true 
        },
      },
    ],
    deliveryAddress: {
      fullName: { 
        type: String, 
        required: true 
      },
      mobile: { 
        type: Number, 
        required: true, 
        minlength: 10, 
        maxlength: 10 
      }, 
      pincode: { 
        type: Number, 
        required: true, 
        minlength: 6, 
        maxlength: 6 
      },
      state: { 
        type: String, 
        required: true 
      },
      address: { 
        type: String, 
        required: true 
      },
      city: { 
        type: String, 
        required: true 
      },
    },
    paymentMethod: {
      type: String,
      enum: ["card", "upi", "cod", "razorpay"],
      default: "cod",
    },
    razorpayPaymentId: { 
      type: String, 
      required: false, // Only populated after a successful Razorpay transaction 
    },
    razorpayOrderId:{
      type: String,
      required: false,
    },
    razorpayPaymentStatus: {
      type: String,
      enum: ["success", "failure", "pending"],
      default: "pending", // Default status before actual payment happens
    },
    totalAmount: { 
      type: Number, 
      required: true, 
      min: 0, 
      // Razorpay expects amounts in paise (1 INR = 100 paise), you can store the amount in paise here
    },
    status: {
      type: String,
      enum: ['Pending', 'Shipped', 'Delivered', 'Cancelled', 'Returned'],
      default: 'Pending',
    },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Pending", "Refunded", "Unpaid"],
      default: "Pending",
    },
  },
  { timestamps: true } // Automatic createdAt and updatedAt fields
);

module.exports = mongoose.model("Order", orderSchema);
