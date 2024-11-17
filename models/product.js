// const mongoose = require("mongoose");

// const productSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true },
//     price: { type: Number, required: true },
//     description: { type: String },
//     image: { type: String, required: true },
//     category: { type: String, required: true },
//     brand: { type: String, required: true },
//     discountPrice: { type: Number, default: null },
//     quantity: { type: Number, required: true },
//     createdAt: { type: Date, default: Date.now },
//     updatedAt: { type: Date, default: Date.now },
//   },
//   { timestamps: true }
// );

// const Product = mongoose.model("Product", productSchema);

// module.exports = Product;

// models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true }, // Name of the perfume
    slug: { type: String, required: true, unique: true }, // URL-friendly identifier
    category: { type: String, required: true }, // e.g., Men's, Women's, Unisex
    description: { type: String, required: true }, // Detailed product description
    brand: { type: String, required: true }, // Brand name
    price: { type: Number, required: true }, // Price of the perfume
    stock: { type: Number, required: true }, // Available stock quantity
    images: [
        {
            url: { type: String, required: true }, // Image URL
            alt: { type: String }, // Alt text for SEO
        },
    ],
    rating: {
        average: { type: Number, default: 0 }, // Average rating out of 5
        count: { type: Number, default: 0 }, // Number of reviews
    },
    reviews: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Ref to user model
            comment: { type: String }, // Review comment
            rating: { type: Number, required: true }, // Rating out of 5
            createdAt: { type: Date, default: Date.now }, // Timestamp
        },
    ],
    size: { type: String }, // e.g., 50ml, 100ml
    offers: [
        {
            title: { type: String }, // Offer title
            discount: { type: Number }, // Percentage discount
            expiry: { type: Date }, // Offer expiry date
        },
    ],
    featured: { type: Boolean, default: false }, // If the product is featured
    createdAt: { type: Date, default: Date.now }, // Timestamp for creation
    updatedAt: { type: Date, default: Date.now }, // Timestamp for the last update
});

// Middleware to automatically update the `updatedAt` field
productSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
