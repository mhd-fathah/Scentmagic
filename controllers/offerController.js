const Offer = require('../models/offerModel')
const Category = require('../models/categories')
const Product = require('../models/product')

const getOffers = async (req, res) => {
    try {
        const offers = await Offer.find();  // Fetch all offers from the database
        const message = req.query.message || null;  // Fetching message if any from query params
        const status = req.query.status || 'error';  // Optional: you can pass status as well
        res.render('admin/offer-management', { offers, message, status , layout: false });  // Render the offers.ejs with the offers data
    } catch (error) {
        console.error("Error fetching offers:", error);
        res.status(500).send('Server error');
    }
};

const getCategories = async (req, res) => {
    try {
        const categories = await Category.find(); // Fetch categories from your database
        console.log(categories);
        
        res.json(categories); // Respond with JSON
    } catch (err) {
        console.error("Error fetching categories:", err);
        res.status(500).send("Error fetching categories");
    }
};

// Get all products
const getProducts = async (req, res) => {
    try {
        // Fetch products that are not marked as deleted
        const products = await Product.find({ isDeleted: false });

        // Respond with the fetched products
        return res.status(200).json(products);
    } catch (error) {
        // Log the error to the server console for debugging
        console.error("Error fetching products:", error);

        // Respond with a clear error message and a 500 status code
        return res.status(500).json({ 
            success: false, 
            message: "Failed to fetch products. Please try again later." 
        });
    }
};


// Add a new offer
const addOffer = async (req, res) => {
    try {
      const {
        name,
        type,
        categoryOrProduct,
        discountValue, // Assume this is in percentage
        startDate,
        endDate,
        status,
        description,
      } = req.body;
  
      const newOffer = new Offer({
        name,
        type,
        categoryOrProduct,
        discountValue,
        startDate,
        endDate,
        status,
        description,
      });
  
      await newOffer.save();
  
      if (type === "Category") {
        const products = await Product.find({ category: categoryOrProduct });
        for (let product of products) {
          const extraDiscount = (product.discount_price * discountValue) / 100;
  
          if (!product.previous_discount_price) {
            product.previous_discount_price = product.discount_price; // Save current discount price
          }
  
          product.discount_price = Math.round(product.discount_price - extraDiscount); // Update discount price
          product.extra_offer_percentage = discountValue; // Save extra offer percentage
          await product.save();
        }
      } else if (type === "Product") {
        const product = await Product.findById(categoryOrProduct);
        if (product) {
          const extraDiscount = (product.discount_price * discountValue) / 100;
  
          if (!product.previous_discount_price) {
            product.previous_discount_price = product.discount_price; // Save current discount price
          }
  
          product.discount_price = Math.round(product.discount_price - extraDiscount); // Update discount price
          product.extra_offer_percentage = discountValue; // Save extra offer percentage
          await product.save();
        }
      }
  
      res.status(201).json({ message: "Offer added and applied successfully" });
    } catch (error) {
      console.error("Error adding offer:", error);
      res.status(500).json({ message: "Error adding offer" });
    }
  };
  

const editOffer = async (req, res) => {
    try {
        const { id, name, type, categoryOrProduct, discountType, discountValue, startDate, endDate, status } = req.body;

        await Offer.findByIdAndUpdate(id, {
            name,
            type,
            categoryOrProduct,
            discountType,
            discountValue,
            startDate,
            endDate,
            status
        });

        res.redirect('/offers');  // Redirect to the offers page after updating the offer
    } catch (error) {
        console.error("Error updating offer:", error);
        res.status(500).send('Server error');
    }
};

const deleteOffer = async (req, res) => {
    try {
      const { offerId } = req.params;
  
      // Find the offer to delete
      const offer = await Offer.findById(offerId);
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }
  
      // Determine whether the offer applies to a category or a product
      if (offer.type === "Category") {
        // Find all products in the category
        const products = await Product.find({ category: offer.categoryOrProduct });
        for (let product of products) {
          if (product.previous_discount_price) {
            product.discount_price = product.previous_discount_price; // Restore previous discount price
            product.previous_discount_price = null; // Clear previous discount price
          }
          product.extra_offer_percentage = 0; // Remove extra offer percentage
          await product.save();
        }
      } else if (offer.type === "Product") {
        // Find the specific product
        const product = await Product.findById(offer.categoryOrProduct);
        if (product && product.previous_discount_price) {
          product.discount_price = product.previous_discount_price; // Restore previous discount price
          product.previous_discount_price = null; // Clear previous discount price
          product.extra_offer_percentage = 0; // Remove extra offer percentage
          await product.save();
        }
      }
  
      // Delete the offer
      await offer.deleteOne();
  
      res.status(200).json({ message: "Offer deleted and prices reverted successfully" });
    } catch (error) {
      console.error("Error deleting offer:", error);
      res.status(500).json({ message: "Error deleting offer" });
    }
  };
  

module.exports = {getOffers , addOffer, editOffer, deleteOffer , getCategories , getProducts};