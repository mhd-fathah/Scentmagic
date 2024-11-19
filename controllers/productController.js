const Product = require("../models/product");
const Category = require("../models/categories");
const fs = require('fs');
const path = require('path');

const getProducts = async (req, res) => {
  try {
    const products = await Product.find({}); // Fetch all products
    console.log("Fetched Products:", products); // Debugging the fetched products
     console.log(products.product_images);
     
    const successMessage = req.query.successMessage || ''; // Fetch success message from query params
    res.render("admin/products", { products, successMessage, layout: false });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Internal Server Error");
  }
};


// Show add product form
const showAddProducts = async (req, res) => {
  try {
    const categories = await Category.find(); // Fetch all categories
    res.render("admin/addProducts", { categories, layout: false });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).send("Internal Server Error");
  }
};

// Handle adding a new product
const addProduct = async (req, res) => {
  try {
    const files = req.files;  // Collect the uploaded files
    const imagePaths = [];

    // Check for each individual file field (image1, image2, etc.)
    if (files.image1) imagePaths.push(files.image1[0].path);
    if (files.image2) imagePaths.push(files.image2[0].path);
    if (files.image3) imagePaths.push(files.image3[0].path);
    if (files.image4) imagePaths.push(files.image4[0].path);

    if (imagePaths.length === 0) {
      return res.status(400).send({ error: "At least one product image is required" });
    }

    console.log("Image Paths:", imagePaths); // Debugging the image paths

    const productData = new Product({
      product_name: req.body.product_name,
      description: req.body.description,
      regular_price: req.body.regular_price,
      discount_price: req.body.discount_price,
      category: req.body.category,
      quantity: req.body.quantity,
      stock_status: req.body.stock_status,
      product_images: imagePaths, // This will be an array of image file paths
    });

    await productData.save(); // Save the product
    res.redirect('/admin/products?successMessage=Product added successfully');  // Redirect with success message
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).send('Error adding product');
  }
};

const editProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    // Find the product by ID
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).send('Product not found');
    }

    const categories = await Category.find(); // Fetch categories for the dropdown
    res.render('admin/editProducts', { product, categories, layout: false });
  } catch (error) {
    console.error('Error fetching product for edit:', error);
    res.status(500).send('Internal Server Error');
  }
};

const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id; // Get the product ID from the request parameters
    const files = req.files || {}; // Ensure req.files is an object, even if it's undefined
    const imagePaths = [];

    // Check if the files exist before accessing them
    if (files.image1) imagePaths.push(files.image1[0].path);
    if (files.image2) imagePaths.push(files.image2[0].path);
    if (files.image3) imagePaths.push(files.image3[0].path);
    if (files.image4) imagePaths.push(files.image4[0].path);

    // Fetch the existing product from the database
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).send({ error: 'Product not found' });
    }

    // Handle image updates: Delete old images if new ones are provided
    const updatedImages = [...existingProduct.product_images]; // Copy existing images
    for (let i = 0; i < imagePaths.length; i++) {
      if (imagePaths[i]) {
        // Delete the old image file if it exists
        const oldImagePath = updatedImages[i];
        if (oldImagePath) {
          const fs = require('fs');
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
        // Replace the old image with the new one
        updatedImages[i] = imagePaths[i];
      }
    }

    // Prepare the updated product data
    const updatedData = {
      product_name: req.body.product_name,
      description: req.body.description,
      regular_price: req.body.regular_price,
      discount_price: req.body.discount_price,
      category: req.body.category,
      quantity: req.body.quantity,
      stock_status: req.body.stock_status,
      product_images: updatedImages, // Update the product images array
    };

    // Update the product in the database
    await Product.findByIdAndUpdate(productId, updatedData, { new: true });
    res.redirect('/admin/products?successMessage=Product updated successfully'); // Redirect with a success message
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).send('Error updating product');
  }
};

const toggleDeleteProduct = async (req, res) => {
  try {
    const productId = req.params.id; // Get product ID from URL

    // Find the product by ID
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send({ error: 'Product not found' });
    }

    // Toggle the isDeleted flag
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { isDeleted: !product.isDeleted }, // Flip the isDeleted value
      { new: true }
    );

    // Check the current action and set the appropriate message
    const action = updatedProduct.isDeleted ? 'soft-deleted' : 'restored';
    res.redirect(`/admin/products?successMessage=Product ${action} successfully`);
  } catch (error) {
    console.error('Error toggling product deletion:', error);
    res.status(500).send('Error toggling product deletion');
  }
};

module.exports = {
  getProducts,
  showAddProducts,
  addProduct,
  editProduct,
  updateProduct,
  toggleDeleteProduct
};
