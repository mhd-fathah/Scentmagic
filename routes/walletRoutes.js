const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
// const orderController = require("../controllers/orderController");
const walletController = require("../controllers/walletController");

// router.post("/refund", auth.checkSession, orderController.handleOrderCancellationOrReturn);
router.get("/balance", auth.checkSession, walletController.getWalletBalance);

router.get('/', auth.checkSession, walletController.getWalletPage);

module.exports = router;