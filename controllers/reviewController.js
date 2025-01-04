const Product = require("../models/product");
const Review = require("../models/review");
const HttpStatus = require("../constants/httpStatus")

const addReview = async (req, res) => {
  const { productId, rating, comment } = req.body; 
  const userId = req.user._id; 

  try {
    
    if (!productId || !rating || !comment) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: "All fields are required." });
    }

    const newReview = new Review({
      user: userId, 
      rating: parseInt(rating), 
      comment,
    });

    await newReview.save(); 

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(HttpStatus.NOT_FOUND).json({ error: "Product not found." });
    }

    product.reviews.push(newReview._id); 
    product.reviewsCount = product.reviews.length; 
    await product.save();

    res.status(HttpStatus.OK).json({ message: "Review added successfully!" });
  } catch (error) {
    console.error("Error adding review:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: "An error occurred while adding the review." });
  }
};

module.exports = {addReview}