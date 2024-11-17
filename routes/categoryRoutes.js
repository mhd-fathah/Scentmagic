const express = require('express');
const categoryController = require('../controllers/categoriesController');
const upload = require('../middleware/upload')
const auth = require('../middleware/adminAuth')
const router = express.Router();




router.get('/categories',auth.isAdminAuthenticated, categoryController.getCategories); 
router.post('/categories/add', upload.single('image'), categoryController.addCategory);

router.get('/categories/edit/:id', categoryController.editCategory);

router.post('/categories/update/:id', upload.single('image'), categoryController.updateCategory);

router.post('/categories/delete/:id', categoryController.deleteCategory);

module.exports = router;
