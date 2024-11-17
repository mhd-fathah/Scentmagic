const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const auth = require("../middleware/adminAuth");
// const categoriesController = require('../controllers/categoriesController')


// Admin login page
router.get("/login", auth.redirectIfAuthenticated, adminController.loadLoginPage);

// Admin login form submission
router.post("/login", adminController.handleLogin);

// Admin dashboard
router.get("/dashboard", auth.isAdminAuthenticated, adminController.loadDashboard);

// Admin logout
router.get('/logout', auth.isAdminAuthenticated, adminController.logoutAdmin);

router.get('/users', auth.isAdminAuthenticated, adminController.listUsers);
router.get('/users/block/:id', auth.isAdminAuthenticated, adminController.blockUser);
router.get('/users/unblock/:id', auth.isAdminAuthenticated, adminController.unblockUser);

// router.get("/categories",categoriesController.loadCategories)

module.exports = router;
