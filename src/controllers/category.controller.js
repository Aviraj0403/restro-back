import Category from "../models/category.model.js";
import Food from "../models/food.model.js"; // Assuming Foods are related to food
import cloudinary from '../config/cloudinaryConfig.js';
import fs from 'fs';

// CREATE CATEGORY
export const createCategory = async (req, res) => {
  try {
    const { name, description, displayOrder, isFeatured, isRecommended } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Name is required." });
    }

    const imageUrl = req.cloudinaryImageUrl || '';
    const publicId = req.cloudinaryPublicId || '';

    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
      console.log(`🧹 Deleted local temp file: ${req.file.path}`);
    }

    const newCategory = await Category.create({
      name,
      description,
      displayOrder,
      isFeatured,
      isRecommended,
      image: imageUrl ? [imageUrl] : [],
      publicId,
      createdBy: req.user._id, // Assuming the `req.user` has the authenticated user ID
    });

    res.status(201).json({ success: true, category: newCategory });
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// UPDATE CATEGORY
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, displayOrder, isFeatured, isRecommended } = req.body;

    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ success: false, message: "Category not found." });

    let imageUrl = category.image?.[0] || '';
    let publicId = category.publicId;

    if (req.file && req.cloudinaryImageUrl && req.cloudinaryPublicId) {
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.warn(`Failed to delete old Cloudinary image: ${err.message}`);
        }
      }

      imageUrl = req.cloudinaryImageUrl;
      publicId = req.cloudinaryPublicId;

      const localPath = req.file.path;
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
        console.log(`Deleted local temp file: ${localPath}`);
      }
    }

    category.name = name || category.name;
    category.description = description || category.description;
    category.displayOrder = displayOrder || category.displayOrder;
    category.isFeatured = isFeatured !== undefined ? isFeatured : category.isFeatured;
    category.isRecommended = isRecommended !== undefined ? isRecommended : category.isRecommended;
    category.image = [imageUrl];
    category.publicId = publicId;

    await category.save();
    res.json({ success: true, category });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// DELETE CATEGORY
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found." });
    }

    // Delete image from Cloudinary
    if (category.publicId) {
      try {
        await cloudinary.uploader.destroy(category.publicId);
      } catch (err) {
        console.warn("Error deleting Cloudinary image:", err.message);
      }
    }

    // Nullify references in Food (Foods)
    await Food.updateMany(
      { category: id },
      { $set: { category: null } }
    );

    await Category.findByIdAndDelete(id);

    res.json({ success: true, message: "Category deleted and related Foods updated." });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// GET ALL CATEGORIES
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ displayOrder: 1 });
    res.json({ success: true, categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// GET MAIN CATEGORIES
export const getMainCategories = async (req, res) => {
  try {
    const categories = await Category.find({ parentCategory: null }).sort({ displayOrder: 1 }).lean();
    res.json({ success: true, categories });
  } catch (error) {
    console.error("Error fetching main categories:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// GET CATEGORY DETAILS
export const getCategoryDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch main category name only
    const mainCategory = await Category.findById(id).select("name").lean();

    if (!mainCategory) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    const subcategories = await Category.find({ parentCategory: id })
      .sort({ displayOrder: 1 })
      .lean();

    const allCategoryIds = [id, ...subcategories.map(cat => cat._id)];

    const foods = await Food.find({
      category: { $in: allCategoryIds }
    }).sort({ createdAt: -1 }).lean();

    // Return only category name
    res.json({
      success: true,
      categoryName: mainCategory.name,
      subcategories,
      foods
    });
  } catch (error) {
    console.error("Error fetching category details:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// GET SINGLE CATEGORY
export const getCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found." });
    }
    res.json({ success: true, category });
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
