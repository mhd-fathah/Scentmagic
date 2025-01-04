const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const auth = require("../middleware/authMiddleware");

router.use(auth.setAuthStatus);

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

router.post(
  "/orders/cancel",
  auth.checkBlocked,
  auth.checkSession,
  orderController.cancelOrder
);

router.post(
  "/orders/return",
  auth.checkBlocked,
  auth.checkSession,
  orderController.returnOrder
);

router.get('/orders/invoice/:orderId',orderController.downloadInvoice)

router.post("/orders/retry-payment", orderController.retryPayment);

module.exports = router;
