const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const upload = require('../middleware/upload');
const auth = require('../middleware/adminAuth');

router.use('/products', auth.isAdminAuthenticated);

router.get('/products', productController.getProducts); 
router.get('/products/add', productController.showAddProducts); 

router.post('/products/add', 
  upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 },
    { name: 'image4', maxCount: 1 }
  ]), 
  productController.addProduct
);

router.get('/products/edit/:id', productController.editProduct);

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

router.get('/products/details/:id', productController.getProductDetails);


module.exports = router;
