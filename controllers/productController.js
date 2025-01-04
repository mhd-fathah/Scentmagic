const Product = require("../models/product");
const Category = require("../models/categories");
const Cart = require('../models/cart')
const HttpStatus = require("../constants/httpStatus")

const getProducts = async (req, res) => {
  try {
    const perPage = 10;
    const page = req.query.page || 1;

    const products = await Product.find({})
      .sort({ createdAt: -1 })
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
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Internal Server Error");
  }
};

const showAddProducts = async (req, res) => {
  try {
    const categories = await Category.find();
    res.render("admin/addProducts", { categories, layout: false });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Internal Server Error");
  }
};

const addProduct = async (req, res) => {
  try {
    const files = req.files || {};
    const imagePaths = [];

    if (files.image1) imagePaths.push(files.image1[0].filename);
    if (files.image2) imagePaths.push(files.image2[0].filename);
    if (files.image3) imagePaths.push(files.image3[0].filename);
    if (files.image4) imagePaths.push(files.image4[0].filename);

    if (imagePaths.length === 0) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .send({ error: "At least one product image is required" });
    }

    const productData = new Product({
      product_name: req.body.product_name || "Unnamed Product",
      shortDescription:
        req.body.shortDescription || "No short description provided.",
      longDescription:
        req.body.longDescription || "No long description provided.",
      regular_price: req.body.regular_price || 0,
      discount_price: req.body.discount_price || 0,
      category: req.body.category,
      netQuantity: req.body.netQuantity || "Not specified",
      stock_status: req.body.stock_status || "In stock",
      product_images: imagePaths,
      highlights: req.body.highlights || "No highlights provided.",
      quantity: req.body.quantity || "0",
      salesPackage: req.body.salesPackage || 0,
      leftStock: req.body.leftStock || 0,
    });

    await productData.save();
    res.redirect("/admin/products?successMessage=Product added successfully");
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ error: "Error adding product" });
  }
};

const editProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(HttpStatus.NOT_FOUND).send("Product not found");
    }

    const categories = await Category.find();
    res.render("admin/editProducts", { product, categories, layout: false });
  } catch (error) {
    console.error("Error fetching product for edit:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Internal Server Error");
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
      return res.status(HttpStatus.NOT_FOUND).send({ error: "Product not found" });
    }

    const updatedImages = [...(existingProduct.product_images || [])];

    imagePaths.forEach((newImage, index) => {
      if (newImage) {
        const oldImagePath = updatedImages[index];
        if (oldImagePath) {
          const fs = require("fs");
          const path = `./public/uploads/products/${oldImagePath}`;
          if (fs.existsSync(path)) {
            fs.unlinkSync(path);
          }
        }
        updatedImages[index] = newImage;
      }
    });

    const updatedData = {
      product_name: req.body.product_name || existingProduct.product_name,
      shortDescription:
        req.body.shortDescription || existingProduct.shortDescription,
      longDescription:
        req.body.longDescription || existingProduct.longDescription,
      regular_price: req.body.regular_price || existingProduct.regular_price,
      discount_price: req.body.discount_price || existingProduct.discount_price,
      category: req.body.category || existingProduct.category,
      netQuantity: req.body.netQuantity || existingProduct.netQuantity,
      stock_status: req.body.stock_status || existingProduct.stock_status,
      product_images: updatedImages,
      highlights: req.body.highlights || existingProduct.highlights,
      quantity: req.body.quantity || existingProduct.quantity,
      salesPackage: req.body.salesPackage || existingProduct.salesPackage,
      leftStock: req.body.leftStock || existingProduct.leftStock,
    };

    await Product.findByIdAndUpdate(productId, updatedData, { new: true });
    res.redirect("/admin/products?successMessage=Product updated successfully");
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ error: "Error updating product" });
  }
};

const toggleDeleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(HttpStatus.NOT_FOUND).send({ error: "Product not found" });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { isDeleted: !product.isDeleted },
      { new: true }
    );

    const action = updatedProduct.isDeleted ? "soft-deleted" : "restored";

    if (updatedProduct.isDeleted) {
      await Cart.updateMany(
        { "items.productId": productId },
        { $pull: { items: { productId: productId } } }
      );
      console.log(`Product with ID ${productId} has been soft-deleted and removed from all carts.`);
    }

    res.redirect(
      `/admin/products?successMessage=Product ${action} successfully`
    );
  } catch (error) {
    console.error("Error toggling product deletion:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error toggling product deletion");
  }
};


const getProductDetails = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(HttpStatus.NOT_FOUND).send("Product not found");
    }

    res.render("admin/product-details", { product, layout: false });
  } catch (error) {
    console.error("Error fetching product details:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Internal Server Error");
  }
};

module.exports = {
  getProducts,
  showAddProducts,
  addProduct,
  editProduct,
  updateProduct,
  toggleDeleteProduct,
  getProductDetails,
};
