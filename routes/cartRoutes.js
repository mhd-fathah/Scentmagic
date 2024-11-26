const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const auth = require('../middleware/authMiddleware')

router.get('/cart',auth.checkSession , cartController.getCart);

router.post('/cart/add',auth.checkSession , cartController.addToCart);

router.post('/cart/remove',auth.checkSession , cartController.removeFromCart);

router.post('/cart/update',auth.checkSession , cartController.updateCartQuantity);

router.get('/cart/details',auth.checkSession , cartController.getCartDetails)

module.exports = router;
