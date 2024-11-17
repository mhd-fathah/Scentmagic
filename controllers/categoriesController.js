const Category = require("../models/categories");
const fs = require("fs");
const path = require("path");
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find();

    res.render("admin/categories", {
      message: req.query.message || null,
      status: req.query.status || null,
      categories: categories,
      layout: false,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).send("Server Error");
  }
};

const addCategory = async (req, res) => {
    try {
      const { name, description } = req.body;
      const image = req.file.filename;
      const oldPath = path.join("public", "uploads", req.file.filename);
      const newPath = path.join(
        "public",
        "uploads",
        "categories",
        req.file.filename
      );
      fs.renameSync(oldPath, newPath);
  
      if (!name || !description) {
        return res.status(400).send("Name, description, and image are required");
      }
  
      const category = new Category({ name, description, image });
      await category.save();

      res.redirect("/admin/categories?message=Category added successfully&status=success");
    } catch (error) {
      console.error("Error adding category:", error);
      res.status(500).send(error.message || "Server Error");
    }
  };
  
  

const editCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(404).send("Category not found");
    }

    res.render("admin/editCategory", { category, layout: false });
  } catch (err) {
    console.log(err);
    res.status(500).send("Server error");
  }
};

const updateCategory = async (req, res) => {
    try {
      const categoryId = req.params.id;
      const { name, description } = req.body;
      let image = null;
  
      const category = await Category.findById(categoryId);
  
      if (req.file) {
        image = req.file.filename;
  
        if (category.image) {
          const oldImagePath = path.join("public", "uploads", "categories", category.image);
          
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
  
        const oldPath = req.file.path; 
        const newPath = path.join("public", "uploads", "categories", req.file.filename);

        const targetDir = path.dirname(newPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
  
        fs.renameSync(oldPath, newPath);
      }
      const updatedCategory = await Category.findByIdAndUpdate(
        categoryId,
        { name, description, image },
        { new: true }
      );

      res.redirect("/admin/categories");
    } catch (err) {
      console.log(err);
      res.status(500).send("Server error");
    }
  };
  

  const deleteCategory = async (req, res) => {
    try {
      const categoryId = req.params.id;

      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).send("Category not found");
      }
  
      const isDeleted = category.isDeleted ? false : true;
  
      await Category.findByIdAndUpdate(categoryId, { isDeleted });
  
      res.redirect("/admin/categories");
  
    } catch (err) {
      console.error("Error in deleteCategory:", err.stack);
      res.status(500).send("Server error");
    }
  };
  
  
module.exports = {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  editCategory,
};
