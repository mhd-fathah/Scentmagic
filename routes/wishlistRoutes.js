const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const auth = require('../middleware/authMiddleware');  // Assuming you have an authentication middleware

// Get all wishlist items
router.get('/', auth.checkSession, wishlistController.getWishlist);

// Add product to wishlist
router.post('/add', auth.checkSession, wishlistController.addToWishlist);

router.post('/move-to-cart',auth.checkSession , wishlistController.moveToCart);

module.exports = router;
