const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const auth = require("../middleware/adminAuth");
const reviewController = require('../controllers/reviewController')
// const categoriesController = require('../controllers/categoriesController')


router.get("/login", auth.redirectIfAuthenticated, adminController.loadLoginPage);

router.post("/login", adminController.handleLogin);

router.get("/dashboard", auth.isAdminAuthenticated, adminController.loadDashboard);

router.get('/logout', auth.isAdminAuthenticated, adminController.logoutAdmin);

router.get('/users', auth.isAdminAuthenticated, adminController.listUsers);
router.get('/users/block/:id', auth.isAdminAuthenticated, adminController.blockUser);
router.get('/users/unblock/:id', auth.isAdminAuthenticated, adminController.unblockUser);

router.get('/users/details/:id', auth.isAdminAuthenticated, adminController.viewUserDetails);

router.post("/add-review",  reviewController.addReview);

router.get('/orders',auth.isAdminAuthenticated , adminController.getAllOrders)

router.get('/order/:id',auth.isAdminAuthenticated , adminController.getOrderDetails);
router.post('/order/:id/update', auth.isAdminAuthenticated, adminController.updateOrderStatus);

router.get('/approve-return/:orderId',auth.isAdminAuthenticated , adminController.approveReturn)
router.get('/reject-return/:orderId',auth.isAdminAuthenticated , adminController.rejectReturn)
// router.get("/categories",categoriesController.loadCategories)

module.exports = router; 
