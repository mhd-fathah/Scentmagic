const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const auth = require('../middleware/authMiddleware')

router.get('/cart',auth.checkBlocked,auth.checkSession , cartController.getCart);

router.post('/cart/add',auth.checkSession , cartController.addToCart);

router.post('/cart/remove',auth.checkSession , cartController.removeFromCart);

router.post('/cart/update',auth.checkSession , cartController.updateCartQuantity);

router.get('/cart/details',auth.checkBlocked,auth.checkSession , cartController.getCartDetails)

router.post('/cart/apply-coupon/:userId',auth.checkSession,cartController.applyCoupon)
router.post('/cart/remove-coupon/:userId',auth.checkSession,cartController.applyCoupon)

module.exports = router;
