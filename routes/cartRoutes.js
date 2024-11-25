const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

// Get the user's cart
router.get('/cart', cartController.getCart);

// Add product to cart
router.post('/cart/add', cartController.addToCart);

// Remove product from cart
router.post('/cart/remove', cartController.removeFromCart);

// Update product quantity in cart
router.post('/cart/update', cartController.updateCartQuantity);

router.get('/cart/details',cartController.getCartDetails)

module.exports = router;
