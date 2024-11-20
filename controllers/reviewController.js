const Product = require("../models/product");
const Review = require("../models/review");

const addReview = async (req, res) => {
  const { productId, rating, comment } = req.body; 
  const userId = req.user._id; 

  try {
    
    if (!productId || !rating || !comment) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const newReview = new Review({
      user: userId, 
      rating: parseInt(rating), 
      comment,
    });

    await newReview.save(); 

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    product.reviews.push(newReview._id); 
    product.reviewsCount = product.reviews.length; 
    await product.save();

    res.status(200).json({ message: "Review added successfully!" });
  } catch (error) {
    console.error("Error adding review:", error);
    res.status(500).json({ error: "An error occurred while adding the review." });
  }
};

module.exports = {addReview}