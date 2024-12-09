const Offer = require("../models/offerModel");
const Category = require("../models/categories");
const Product = require("../models/product");

const getOffers = async (req, res) => {
  try {
    const offers = await Offer.find();
    const message = req.query.message || null;
    const status = req.query.status || "error";
    res.render("admin/offer-management", {
      offers,
      message,
      status,
      layout: false,
    });
  } catch (error) {
    console.error("Error fetching offers:", error);
    res.status(500).send("Server error");
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    console.log(categories);

    res.json(categories);
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).send("Error fetching categories");
  }
};

const getProducts = async (req, res) => {
  try {
    const products = await Product.find({ isDeleted: false });

    return res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch products. Please try again later.",
    });
  }
};

const addOffer = async (req, res) => {
  try {
    const {
      name,
      type,
      categoryOrProduct,
      discountValue,
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
          product.previous_discount_price = product.discount_price;
        }

        product.discount_price = Math.round(
          product.discount_price - extraDiscount
        );
        product.extra_offer_percentage = discountValue;
        await product.save();
      }
    } else if (type === "Product") {
      const product = await Product.findById(categoryOrProduct);
      if (product) {
        const extraDiscount = (product.discount_price * discountValue) / 100;

        if (!product.previous_discount_price) {
          product.previous_discount_price = product.discount_price;
        }

        product.discount_price = Math.round(
          product.discount_price - extraDiscount
        );
        product.extra_offer_percentage = discountValue;
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
    const {
      id,
      name,
      type,
      categoryOrProduct,
      discountType,
      discountValue,
      startDate,
      endDate,
      status,
    } = req.body;

    await Offer.findByIdAndUpdate(id, {
      name,
      type,
      categoryOrProduct,
      discountType,
      discountValue,
      startDate,
      endDate,
      status,
    });

    res.redirect("/offers");
  } catch (error) {
    console.error("Error updating offer:", error);
    res.status(500).send("Server error");
  }
};

const deleteOffer = async (req, res) => {
  try {
    const { offerId } = req.params;

    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    if (offer.type === "Category") {
      const products = await Product.find({
        category: offer.categoryOrProduct,
      });
      for (let product of products) {
        if (product.previous_discount_price) {
          product.discount_price = product.previous_discount_price;
          product.previous_discount_price = null;
        }
        product.extra_offer_percentage = 0;
        await product.save();
      }
    } else if (offer.type === "Product") {
      const product = await Product.findById(offer.categoryOrProduct);
      if (product && product.previous_discount_price) {
        product.discount_price = product.previous_discount_price;
        product.previous_discount_price = null;
        product.extra_offer_percentage = 0;
        await product.save();
      }
    }

    await offer.deleteOne();

    res
      .status(200)
      .json({ message: "Offer deleted and prices reverted successfully" });
  } catch (error) {
    console.error("Error deleting offer:", error);
    res.status(500).json({ message: "Error deleting offer" });
  }
};

module.exports = {
  getOffers,
  addOffer,
  editOffer,
  deleteOffer,
  getCategories,
  getProducts,
};
