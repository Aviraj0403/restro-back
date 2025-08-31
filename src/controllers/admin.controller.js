import Food from "../models/food.model.js";
import cloudinary from '../config/cloudinaryConfig.js';  // Assuming Cloudinary is configured
import fs from 'fs';

export const createFood = async (req, res) => {
  try {
    const {
      name,
      description,
      ingredients,
      category,
      foodImages,
      isHotProduct,
      isBudgetBite,
      isSpecialOffer,
      variants,
      isFeatured,
      isRecommended,
      status,
      cookTime,
      itemType,
      variety,
      createdBy,
      discount
    } = req.body;

    // Validate required fields
    if (!name || !category) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: name and category."
      });
    }

    // Handle image upload using Cloudinary
    const imageUrls = [];
    if (foodImages && foodImages.length > 0) {
      for (let i = 0; i < foodImages.length; i++) {
        const file = foodImages[i];
        const uploadResult = await cloudinary.uploader.upload(file.path, {
          folder: 'food_images', // Folder for food images in Cloudinary
          resource_type: 'image',
          transformation: [
            { width: 800, height: 800, crop: 'limit' },
            { quality: 'auto' },
            { fetch_format: 'webp' },
          ],
        });
        imageUrls.push(uploadResult.secure_url);
        fs.unlinkSync(file.path);  // Clean up after upload
      }
    }

    // Create new food item
    const newFood = await Food.create({
      name,
      description,
      ingredients,
      category,
      foodImages: imageUrls,
      isHotProduct,
      isBudgetBite,
      isSpecialOffer,
      variants,
      isFeatured: isFeatured !== undefined ? isFeatured : false,
      isRecommended,
      status,
      cookTime,
      itemType,
      variety,
      createdBy,
      discount :discount || 0,
    });

    res.status(201).json({
      success: true,
      message: "Food item created successfully.",
      food: newFood,
    });
  } catch (error) {
    console.error("Error creating food:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while creating the food item."
    });
  }
};

// Update food images
export const updateFoodImages = async (req, res) => {
  try {
    const { foodId } = req.params;
    const files = req.files;  // Get the files uploaded via form-data

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one image.",
      });
    }

    // Fetch the food item to know its existing images
    const foodItem = await Food.findById(foodId);
    if (!foodItem) {
      return res.status(404).json({
        success: false,
        message: "Food item not found."
      });
    }

    // Delete previous images from Cloudinary
    if (foodItem.foodImages && foodItem.foodImages.length > 0) {
      for (const imageUrl of foodItem.foodImages) {
        const regex = /\/upload\/(?:v\d+\/)?([^\.]+)/;
        const match = imageUrl.match(regex);
        if (match && match[1]) {
          const publicId = match[1];
          try {
            await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
          } catch (err) {
            console.error("Error deleting image from Cloudinary:", err);
          }
        }
      }
    }

    // Upload new images to Cloudinary
    const imageUrls = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uploadResult = await cloudinary.uploader.upload(file.path, {
        folder: 'food_images',
        resource_type: 'image',
        transformation: [
          { width: 800, height: 800, crop: 'limit' },
          { quality: 'auto' },
          { fetch_format: 'webp' },
        ],
      });
      imageUrls.push(uploadResult.secure_url);
      fs.unlinkSync(file.path);  // Clean up after upload
    }

    // Update the food item with new image URLs
    const updatedFood = await Food.findByIdAndUpdate(
      foodId,
      { foodImages: imageUrls },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Food images updated successfully.",
      food: updatedFood,
    });
  } catch (error) {
    console.error("Error updating food images:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while updating the food images."
    });
  }
};
