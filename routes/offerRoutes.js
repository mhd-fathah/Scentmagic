const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController'); 

router.get('/offers', offerController.getOffers);

router.post('/offers/add', offerController.addOffer);

router.post('/offers/edit', offerController.editOffer);

router.delete('/offers/delete/:offerId', offerController.deleteOffer);

router.get('/offers/category',offerController.getCategories)

router.get('/offers/product',offerController.getProducts)

module.exports = router;
