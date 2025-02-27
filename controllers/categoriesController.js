const Category = require("../models/categories");
const fs = require("fs");
const path = require("path");
const HttpStatus = require("../constants/httpStatus");
const Messages = require("../constants/messages");
const URLs = require("../constants/urls");

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.render("admin/categories", {
      message: req.query.message || null,
      status: req.query.status || null,
      categories,
      layout: false,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Server Error");
  }
};

const addCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !description || !req.file) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json("Name, description, and image are required");
    }

    const image = req.file.filename;
    const uploadDir = path.join("public", "uploads", "categories");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const newPath = path.join(uploadDir, image);
    fs.renameSync(req.file.path, newPath);

    const category = new Category({ name, description, image });
    await category.save();

    const message = Messages.CATEGORY_ADDED_SUCCESS;
    const status = "success";
    res.redirect(
      `${URLs.ADMIN_CATEGORIES}?message=${encodeURIComponent(
        message
      )}&status=${status}`
    );
  } catch (error) {
    console.error("Error adding category:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Server Error");
  }
};

const editCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category)
      return res.status(HttpStatus.NOT_FOUND).send("Category not found");

    res.render("admin/editCategory", {
      category,
      layout: false,
      message: req.query.message,
    });
  } catch (error) {
    console.error("Error editing category:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Server Error");
  }
};

const updateCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category)
      return res.status(HttpStatus.NOT_FOUND).send("Category not found");

    if (req.file) {
      const newImage = req.file.filename;
      const uploadDir = path.join("public", "uploads", "categories");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const newPath = path.join(uploadDir, newImage);
      fs.renameSync(req.file.path, newPath);

      if (category.image) {
        const oldImagePath = path.join(uploadDir, category.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      category.image = newImage;
    }

    category.name = name;
    category.description = description;
    await category.save();

    const message = Messages.CATEGORY_UPDATED_SUCCESS;
    const status = "success";
    res.redirect(
      `${URLs.ADMIN_CATEGORIES}?message=${encodeURIComponent(message)}&status=${status}`
    );
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Server Error");
  }
};

const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category)
      return res.status(HttpStatus.NOT_FOUND).send("Category not found");

    category.isDeleted = !category.isDeleted;
    await category.save();

    const message = Messages.CATEGORY_DELETED_SUCCESS;
    const status = "success";
    res.redirect(
      `${URLs.ADMIN_CATEGORIES}?message=${encodeURIComponent(message)}&status=${status}`
    );
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Server Error");
  }
};

module.exports = {
  getCategories,
  addCategory,
  editCategory,
  updateCategory,
  deleteCategory,
};
