const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const auth = require('../middleware/authMiddleware');  

router.get('/',auth.checkBlocked , auth.checkSession, wishlistController.getWishlist);

router.post('/add', auth.checkSession, wishlistController.addToWishlist);

router.post('/move-to-cart',auth.checkSession , wishlistController.moveToCart);

router.get('/details',auth.checkSession,wishlistController.getWishlistDetails)

module.exports = router;
