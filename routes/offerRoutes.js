const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');  // Adjust the path as needed

// Route to get all offers and render the offers page
router.get('/offers', offerController.getOffers);

// Route to add a new offer
router.post('/offers/add', offerController.addOffer);

// Route to edit an existing offer
router.post('/offers/edit', offerController.editOffer);

// Route to delete an offer
router.delete('/offers/delete/:offerId', offerController.deleteOffer);

router.get('/offers/category',offerController.getCategories)

router.get('/offers/product',offerController.getProducts)

module.exports = router;
