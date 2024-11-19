const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const upload = require('../middleware/upload');
const auth = require('../middleware/adminAuth');

// Apply admin authentication middleware globally for all routes under /products
router.use('/products', auth.isAdminAuthenticated);

// Product routes
router.get('/products', productController.getProducts); // Fetch and display all products
router.get('/products/add', productController.showAddProducts); // Show the form to add a product

// Handle adding a new product with multiple image uploads
router.post('/products/add', 
  upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 },
    { name: 'image4', maxCount: 1 }
  ]), 
  productController.addProduct
);

// Show the form to edit a product
router.get('/products/edit/:id', productController.editProduct);

// Handle product update with multiple image uploads
router.post('/products/edit/:id', 
  upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 },
    { name: 'image4', maxCount: 1 }
  ]), 
  productController.updateProduct
);

router.post('/products/delete/:id', productController.toggleDeleteProduct);

module.exports = router;
