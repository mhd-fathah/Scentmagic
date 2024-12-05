const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the User model
      required: true,
    },
    balance: {
      type: Number,
      default: 0, // Initial balance is 0
    },
    transactions: [
      {
        id: {
          type: String, // Unique transaction ID
          required: true,
        },
        type: {
          type: String, // Transaction type (e.g., "Refund", "Order Cancel")
          required: true,
        },
        amount: {
          type: Number, // Positive for credit, negative for debit
          required: true,
        },
        date: {
          type: Date,
          default: Date.now, // Automatically set the transaction date
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Wallet", walletSchema);
