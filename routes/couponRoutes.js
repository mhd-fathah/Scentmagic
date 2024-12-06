const express = require('express')
const router = express.Router()
const couponController = require('../controllers/couponController')
const auth = require('../middleware/adminAuth')

router.get('/coupon',auth.isAdminAuthenticated , couponController.getCouponsPage)

router.post('/coupon/add',auth.isAdminAuthenticated , couponController.addCoupon)

router.get('/coupon/details/:id',auth.isAdminAuthenticated , couponController.getCouponDetails)

module.exports = router;