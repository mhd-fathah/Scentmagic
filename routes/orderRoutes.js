const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const auth = require("../middleware/authMiddleware");

router.post(
  "/order-confirmation",
  auth.checkSession,
  orderController.placeOrder
);

router.get(
  "/order-confirmation/:orderId",
  auth.checkBlocked,
  auth.checkSession,
  orderController.viewOrderConfirmation
);

router.post(
  "/order-initiate",
  auth.checkSession,
  orderController.initiateOrder
);

router.post(
  "/order-payment-success",
  auth.checkSession,
  orderController.confirmPayment
);

router.get(
  "/my-orders",
  auth.checkBlocked,
  auth.checkSession,
  orderController.getUserOrders
);

router.get(
  "/my-orders/order-details/:id",
  auth.checkBlocked,
  auth.checkSession,
  orderController.viewOrderDetails
);

router.get(
  "/orders/cancel/:orderId",
  auth.checkBlocked,
  auth.checkSession,
  orderController.cancelOrder
);

router.get(
  "/orders/return/:orderId",
  auth.checkBlocked,
  auth.checkSession,
  orderController.returnOrder
);

module.exports = router;
