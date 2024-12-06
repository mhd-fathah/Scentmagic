const express = require('express')
const router = express.Router()
const couponController = require('../controllers/couponController')
const auth = require('../middleware/adminAuth')

router.get('/coupon',auth.isAdminAuthenticated , couponController.getCouponsPage)

router.post('/coupon/add',auth.isAdminAuthenticated , couponController.addCoupon)

router.get('/coupon/details/:id',auth.isAdminAuthenticated , couponController.getCouponDetails)

router.post('/coupon/edit',auth.isAdminAuthenticated , couponController.editCoupon)

router.post('/coupon/deactivate',auth.isAdminAuthenticated,couponController.deactivateCoupon)

module.exports = router;