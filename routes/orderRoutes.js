const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const auth = require('../middleware/authMiddleware')

router.post("/order-confirmation",auth.checkSession , orderController.placeOrder);

router.get(
  "/order-confirmation/:orderId",
  auth.checkSession,
  orderController.viewOrderConfirmation
);

router.get('/my-orders',auth.checkSession , orderController.getUserOrders)

router.get('/my-orders/order-details/:id' ,auth.checkSession , orderController.viewOrderDetails)

module.exports = router;
