const Offer = require("../models/offerModel");
const Category = require("../models/categories");
const Product = require("../models/product");
const HttpStatus = require("../constants/httpStatus")

const getOffers = async (req, res) => {
  try {
    const { status, type, search } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const offers = await Offer.find(filter).populate({
      path: "categoryOrProduct",
      select: "name product_name",
    });

    const message = req.query.message || null;
    const responseStatus = req.query.status || "error";

    res.render("admin/offer-management", {
      offers,
      message,
      status: responseStatus,
      type,
      search,
      layout: false,
    });
  } catch (error) {
    console.error("Error fetching offers:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Server error");
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    console.log(categories);

    res.json(categories);
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Error fetching categories");
  }
};

const getProducts = async (req, res) => {
  try {
    const products = await Product.find({ isDeleted: false });

    return res.status(HttpStatus.OK).json(products);
  } catch (error) {
    console.error("Error fetching products:", error);

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
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
      discountType,
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
      discountType,
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

    return res
      .status(HttpStatus.CREATED)
      .json({ success: true, message: "Offer added and applied successfully" });
  } catch (error) {
    console.error("Error adding offer:", error);
    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Error adding offer" });
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
      description,
    } = req.body;

    const existingOffer = await Offer.findById(id);
    if (!existingOffer) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .json({ success: false, message: "Offer not found" });
    }

    existingOffer.name = name;
    existingOffer.type = type;
    existingOffer.categoryOrProduct = categoryOrProduct
    existingOffer.discountType = discountType
    existingOffer.discountValue = discountValue;
    existingOffer.startDate = startDate
    existingOffer.endDate = endDate;
    existingOffer.status = status
    existingOffer.description = description;

    await existingOffer.save();

    if (type === "Category") {
      const products = await Product.find({ category: categoryOrProduct })
      for (let product of products) {
        const extraDiscount = (product.discount_price * discountValue) / 100;

        if (product.previous_discount_price) {
          product.discount_price = product.previous_discount_price
        }

        product.previous_discount_price = product.discount_price
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

        if (product.previous_discount_price) {
          product.discount_price = product.previous_discount_price;
        }

        product.previous_discount_price = product.discount_price
        product.discount_price = Math.round(
          product.discount_price - extraDiscount
        );
        product.extra_offer_percentage = discountValue;
        await product.save();
      }
    }

    return res.status(HttpStatus.OK).json({
      success: true,
      message: "Offer updated and applied successfully",
    });
  } catch (error) {
    console.error("Error updating offer:", error);
    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Error updating offer" });
  }
};

const deleteOffer = async (req, res) => {
  try {
    const { offerId } = req.params;

    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: "Offer not found" });
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
      .status(HttpStatus.OK)
      .json({ message: "Offer deleted and prices reverted successfully" });
  } catch (error) {
    console.error("Error deleting offer:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: "Error deleting offer" });
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
