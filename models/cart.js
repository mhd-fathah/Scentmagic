const mongoose = require('mongoose');

// Assuming you already have the Product schema in a file
const Product = require('./product');  // Import the Product model

// Cart Item schema for each item in the cart
const cartItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },  // Reference to the Product model
    quantity: { type: Number, required: true, default: 1 },
    deliveryDate: { type: String, required: true },  // Delivery date as a string (e.g., "Dec 10, 2024")
});

// Cart schema to store cart data
const cartSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [cartItemSchema],  // Array of cart items
    totalPrice: { type: Number, required: true, default: 0 },  // Total price of all cart items
    createdAt: { type: Date, default: Date.now },  // Time of cart creation or last updated
});

cartSchema.methods.calculateTotalPrice = function () {
    this.totalPrice = this.items.reduce(async (total, item) => {
        // Fetch product details by ID
        const product = await Product.findById(item.productId);
        const itemTotal = product.discount_price * item.quantity;
        return total + itemTotal;
    }, 0);
};

// Pre-save hook to recalculate total price before saving the cart
cartSchema.pre('save', async function (next) {
    await this.calculateTotalPrice();
    next();
});

module.exports = mongoose.model('Cart', cartSchema);
