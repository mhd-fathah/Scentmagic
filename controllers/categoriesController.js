const Category = require("../models/categories");
const fs = require("fs");
const path = require("path");

// Fetch categories
const getCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        res.render("admin/categories", {
            message: req.query.message || null,
            status: req.query.status || null,
            categories,
            layout: false,
        });
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).send("Server Error");
    }
};

// Add new category
const addCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name || !description || !req.file) {
            return res.status(400).send("Name, description, and image are required");
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

        res.redirect("/admin/categories?message=Category added successfully&status=success");
    } catch (error) {
        console.error("Error adding category:", error);
        res.status(500).send("Server Error");
    }
};

// Edit category
const editCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).send("Category not found");

        res.render("admin/editCategory", { category, layout: false });
    } catch (error) {
        console.error("Error editing category:", error);
        res.status(500).send("Server Error");
    }
};

// Update category
const updateCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        const category = await Category.findById(req.params.id);

        if (!category) return res.status(404).send("Category not found");

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

        res.redirect("/admin/categories");
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).send("Server Error");
    }
};

// Soft delete category
const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).send("Category not found");

        category.isDeleted = !category.isDeleted;
        await category.save();

        res.redirect("/admin/categories");
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).send("Server Error");
    }
};

module.exports = {
    getCategories,
    addCategory,
    editCategory,
    updateCategory,
    deleteCategory,
};
