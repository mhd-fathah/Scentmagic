const Product = require("../models/product");
const Category = require("../models/categories");

const getProducts = async (req, res) => {
  try {
    const perPage = 12;
    const page = req.query.page || 1;

    const products = await Product.find({})
      .skip(perPage * page - perPage)
      .limit(perPage);

    const count = await Product.countDocuments();

    const successMessage = req.query.successMessage || "";

    res.render("admin/products", {
      products,
      successMessage,
      currentPage: page,
      totalPages: Math.ceil(count / perPage),
      layout: false,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Internal Server Error");
  }
};

const showAddProducts = async (req, res) => {
  try {
    const categories = await Category.find();
    res.render("admin/addProducts", { categories, layout: false });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).send("Internal Server Error");
  }
};

const addProduct = async (req, res) => {
  try {
    const files = req.files;
    const imagePaths = [];

    if (files.image1) imagePaths.push(files.image1[0].filename);
    if (files.image2) imagePaths.push(files.image2[0].filename);
    if (files.image3) imagePaths.push(files.image3[0].filename);
    if (files.image4) imagePaths.push(files.image4[0].filename);

    if (imagePaths.length === 0) {
      return res
        .status(400)
        .send({ error: "At least one product image is required" });
    }

    console.log("Image Paths:", imagePaths);

    const productData = new Product({
      product_name: req.body.product_name,
      description: req.body.description,
      regular_price: req.body.regular_price,
      discount_price: req.body.discount_price,
      category: req.body.category,
      quantity: req.body.quantity,
      stock_status: req.body.stock_status,
      product_images: imagePaths,
    });

    await productData.save();
    res.redirect("/admin/products?successMessage=Product added successfully");
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).send("Error adding product");
  }
};

const editProduct = async (req, res) => {
  try {
    
    const productId = req.params.id;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).send("Product not found");
    }

    const categories = await Category.find();
    res.render("admin/editProducts", { product, categories, layout: false });
  } catch (error) {
    console.error("Error fetching product for edit:", error);
    res.status(500).send("Internal Server Error");
  }
};

const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const files = req.files || {};
    const imagePaths = [];

    if (files.image1) imagePaths.push(files.image1[0].filename);
    if (files.image2) imagePaths.push(files.image2[0].filename);
    if (files.image3) imagePaths.push(files.image3[0].filename);
    if (files.image4) imagePaths.push(files.image4[0].filename);

    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).send({ error: "Product not found" });
    }

    const updatedImages = [...existingProduct.product_images];
    for (let i = 0; i < imagePaths.length; i++) {
      if (imagePaths[i]) {
        const oldImagePath = updatedImages[i];
        if (oldImagePath) {
          const fs = require("fs");
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }

        updatedImages[i] = imagePaths[i];
      }
    }

    const updatedData = {
      product_name: req.body.product_name,
      description: req.body.description,
      regular_price: req.body.regular_price,
      discount_price: req.body.discount_price,
      category: req.body.category,
      quantity: req.body.quantity,
      stock_status: req.body.stock_status,
      product_images: updatedImages,
    };

    await Product.findByIdAndUpdate(productId, updatedData, { new: true });
    res.redirect("/admin/products?successMessage=Product updated successfully");
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).send("Error updating product");
  }
};

const toggleDeleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send({ error: "Product not found" });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { isDeleted: !product.isDeleted },
      { new: true }
    );

    const action = updatedProduct.isDeleted ? "soft-deleted" : "restored";
    res.redirect(
      `/admin/products?successMessage=Product ${action} successfully`
    );
  } catch (error) {
    console.error("Error toggling product deletion:", error);
    res.status(500).send("Error toggling product deletion");
  }
};

const getProductDetails = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).send("Product not found");
    }

    res.render("admin/product-details", { product, layout: false });
  } catch (error) {
    console.error("Error fetching product details:", error);
    res.status(500).send("Internal Server Error");
  }
};


module.exports = {
  getProducts,
  showAddProducts,
  addProduct,
  editProduct,
  updateProduct,
  toggleDeleteProduct,
  getProductDetails
};
