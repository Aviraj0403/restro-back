import express from 'express';
import {
  createCategory,
  getAllCategories,
  getCategory,
  updateCategory,
  deleteCategory,
  getMainCategories,
  getCategoryDetails
} from '../controllers/category.controller.js';
import upload from '../middlewares/upload.js';
import { uploadSingleImageToCloudinary } from '../controllers/imageUploadController.js';
import { verifyToken } from '../middlewares/verifyToken.js';  

const router = express.Router();

// CREATE CATEGORY
router.post("/createCategory", 
  upload.single('image'), verifyToken, 
  uploadSingleImageToCloudinary, 
  createCategory
);

// GET ALL CATEGORIES
router.get("/getAllCategories", getAllCategories);

// GET MAIN CATEGORIES
router.get("/getMainCategories", getMainCategories);

// GET SINGLE CATEGORY
router.get("/getCategory/:id", getCategory);

// GET CATEGORY DETAILS (Including subcategories and related foods)
router.get("/getCategoryDetails/:id", getCategoryDetails);

// UPDATE CATEGORY
router.put("/updateCategory/:id", 
  upload.single('image'), 
  verifyToken, 
  uploadSingleImageToCloudinary, 
  updateCategory
);

// DELETE CATEGORY
router.delete("/deleteCategory/:id", deleteCategory);

export default router;
