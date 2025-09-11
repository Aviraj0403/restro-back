import Food from "../models/food.model.js";
import Category from "../models/category.model.js";  // Assuming Foods are related to category  
import cloudinary from '../config/cloudinaryConfig.js';  // Assuming Cloudinary is configured
import { promises as fs } from 'fs';
// import client from '../config/redisClient.js'; // Redis client
import { uploadMultipleImagesToCloudinary, deleteImagesByUrlsFromCloudinary, uploadSingleImageToCloudinary } from './imageUploadController.js'; // Image upload helper
import redis from 'redis';
// import { clearAllRedisCache } from '../services/redis.service.js'; // Import Redis cache clearing function
import mongoose from 'mongoose';
export const createFood = async (req, res) => {
  try {
    const {
      name,
      description = "",
      ingredients = [],
      category,
      isHotProduct = false,
      isBudgetBite = false,
      isSpecialOffer = false,
      variants = [],
      isFeatured = false,
      isRecommended = false,
      status = "Active",
      cookTime = "",
      itemType = "",
      variety = "",
      // createdBy = "admin", // Replace with real user ID in production
      discount = 0,
    } = req.body;
    const createdBy = req.user.id;
    // ✅ Validate required fields
    if (!name || !category) {
      return res.status(400).json({
        success: false,
        message: "Name and category are required.",
      });
    }

    // ✅ Process ingredients
    let ingredientArray = [];
    if (typeof ingredients === "string") {
      ingredientArray = ingredients.split(",").map((i) => i.trim());
    } else if (Array.isArray(ingredients)) {
      ingredientArray = ingredients;
    }

    // ✅ Validate variants
    if (!Array.isArray(variants)) {
      return res.status(400).json({
        success: false,
        message: "Variants must be an array.",
      });
    }

    // ✅ Handle file uploads
    const files = req.files; // multer adds this
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one image.",
      });
    }

    const imageUrls = [];

    for (const file of files) {
      try {
        // Upload to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(file.path, {
          folder: "food_images",
          resource_type: "image",
          transformation: [
            { width: 800, height: 800, crop: "limit" },
            { quality: "auto" },
            { fetch_format: "webp" },
          ],
        });

        imageUrls.push(uploadResult.secure_url);

        // Delete local file after upload
        fs.unlink(file.path);
      } catch (uploadErr) {
        console.error("❌ Cloudinary Upload Error:", uploadErr);
        // Clean up uploaded images if partial upload
        for (const uploaded of imageUrls) {
          const publicId = uploaded.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(`food_images/${publicId}`);
        }
        return res.status(500).json({
          success: false,
          message: "Image upload failed. Please try again.",
        });
      }
    }

    // ✅ Create food in DB
    const newFood = await Food.create({
      name,
      description,
      ingredients: ingredientArray,
      category,
      foodImages: imageUrls,
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
      discount,
    });

    return res.status(201).json({
      success: true,
      message: "✅ Food item created successfully.",
      food: newFood,
    });
  } catch (error) {
    console.error("❌ Error in createFood:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating food item.",
    });
  }
};

export const updateFoodImages = async (req, res) => {
    try {
        const { foodId } = req.params;
        const files = req.files;  // Get the files uploaded via form-data

        // Check if files are provided
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

        // Delete previous images from Cloudinary (if any)
        if (foodItem.foodImages && foodItem.foodImages.length > 0) {
            await deleteImagesByUrlsFromCloudinary(foodItem.foodImages);
        }

        // Upload new images to Cloudinary (supporting both single and multiple images)
        const imageUrls = await uploadMultipleImagesToCloudinary(files); // This will handle both single and multiple images

        // Update the food item with new image URLs
        const updatedFood = await Food.findByIdAndUpdate(
            foodId,
            { foodImages: imageUrls },  // Update with the new image URLs
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

export const getAdminFood = async (req, res) => {
  try {
    const { page = 1, limit = 12, search = '', category } = req.query;
    const skip = (page - 1) * limit;
    let foods = [];
    let totalFoods = 0;

    const categoryFilter = category ? { category } : {};

   
    if (search) {
      const textQuery = {
        ...categoryFilter,
        $text: { $search: search },
      };

      foods = await Food.find(textQuery)
        .populate('category' ,'name') 
        .skip(Number(skip))
        .limit(Number(limit))
        .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
        .select({ score: { $meta: 'textScore' } })
        .lean(); 

      totalFoods = await Food.countDocuments(textQuery);

      if (foods.length === 0) {
        const regexQuery = {
          ...categoryFilter,
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { ingredients: { $regex: search, $options: 'i' } },
          ],
        };

        foods = await Food.find(regexQuery)
          .populate('category', 'name') 
          .skip(Number(skip))
          .limit(Number(limit))
          .sort({ createdAt: -1 })
          .lean(); 

        totalFoods = await Food.countDocuments(regexQuery);
      }
    } else {
      // No search query, just filter by category
      const query = { ...categoryFilter };

      foods = await Food.find(query)
        .populate('category' ,'name') // Populate category
        .skip(Number(skip))
        .limit(Number(limit))
        .sort({ createdAt: -1 })
        .lean(); // Added lean here

      totalFoods = await Food.countDocuments(query);
    }

    foods = foods.map((food) => {
      food.variants = food.variants.map((variant) => {
        if (food.discount > 0) {
          variant.priceAfterDiscount =
            variant.price - variant.price * (food.discount / 100);
        } else {
          variant.priceAfterDiscount = variant.price;
        }
        return variant;
      });
      return food;
    });

    // Prepare pagination data
    const pagination = {
      total: totalFoods,
      page: Number(page),
      totalPages: Math.ceil(totalFoods / limit),
      limit: Number(limit),
    };

    // Respond with food data and pagination
    res.json({
      success: true,
      foods,
      pagination,
    });
  } catch (error) {
    console.error('Error fetching foods:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllFood = async (req, res) => {
  try {
    // Destructuring query parameters
    const { page = 1, limit = 12, search = '', category, isHotProduct, isBudgetBite, isFeatured, isRecommended } = req.query;

    // Basic validation for pagination
    const pageNum = Math.max(1, Number(page));  // Ensure positive page number
    const limitNum = Math.min(100, Number(limit));  // Cap limit to avoid performance issues with too many results
    const skip = (pageNum - 1) * limitNum;

    // Aggregation pipeline
    let pipeline = [];

    // Filters
    let matchStage = {};

    // Add text search filter if search query is provided
    if (search) {
      matchStage.$text = { $search: search };  // Full-text search for name, description, and ingredients
    }

    // Add other filters
    if (category) matchStage.category = mongoose.Types.ObjectId(category);
    if (isHotProduct) matchStage.isHotProduct = true;
    if (isBudgetBite) matchStage.isBudgetBite = true;
    if (isFeatured) matchStage.isFeatured = true;
    if (isRecommended) matchStage.isRecommended = true;

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // Add text score sorting (if search query is used)
    if (search) {
      pipeline.push({
        $addFields: {
          score: { $meta: 'textScore' }
        }
      });
    }

    // Sort by text score (if search query) or by createdAt
    pipeline.push({
      $sort: search ? { score: { $meta: 'textScore' }, createdAt: -1 } : { createdAt: -1 }
    });

    // Pagination: Skip and Limit
    pipeline.push(
      { $skip: skip },
      { $limit: limitNum }
    );

    // Projection: Only fetch necessary fields
    pipeline.push({
      $project: {
        name: 1,
        description: 1,
        foodImages: 1,
        variants: 1,
        category: 1,
        priceAfterDiscount: 1,
        isHotProduct: 1,
        isBudgetBite: 1,
        isFeatured: 1,
        ingredients: 1,
        isRecommended: 1,
        isSpecialOffer: 1,
        cookTime: 1,
        itemType: 1,
        variety: 1,
        status: 1,
        discount: 1,
        score: search ? { $meta: 'textScore' } : undefined  // Include text score if searching
      }
    });

    // Run aggregation pipeline
    const foods = await Food.aggregate(pipeline);

    // Fetch total count for pagination (without skip/limit)
    const totalFoods = await Food.countDocuments(matchStage);

    // Pagination metadata
    const pagination = {
      total: totalFoods,
      page: pageNum,
      totalPages: Math.ceil(totalFoods / limitNum),
      limit: limitNum,
    };

    // If no results, return an empty response
    if (!foods.length) {
      return res.json({
        success: true,
        foods: [],
        pagination,
      });
    }

    // Send the response with foods and pagination data
    return res.json({
      success: true,
      foods,
      pagination,
    });

  } catch (error) {
    console.error('Error fetching foods:', error);
    res.status(500).json({ success: false, message: 'An error occurred while fetching foods.' });
  }
};

export const getMenuFood = async (req, res) => {
  try {
    // ✅ 1) Get all active categories (O(1) indexed)
    const categories = await Category.find({ isActive: true, isDeleted: false })
      .sort({ displayOrder: 1 })
      .lean(); // return plain JS, faster than mongoose docs

    if (!categories.length) {
      return res.status(404).json({ success: false, message: "No categories found" });
    }

    // ✅ 2) Get all active foods in one query (O(1) with index on category+status)
    const foods = await Food.find({ status: "Active" })
      .select("name description foodImages discount isHotProduct isBudgetBite isSpecialOffer isFeatured isRecommended itemType variety category variants")
      .populate("category", "name")
      .lean();

    // ✅ 3) Pre-group foods by categoryId for O(1) lookup
    const foodMap = {};
    foods.forEach(food => {
      const catId = food.category?._id?.toString();
      if (!foodMap[catId]) foodMap[catId] = [];
      foodMap[catId].push({
        id: food._id,
        name: food.name,
        desc: food.description,
        image: food.foodImages[0],
        discount: food.discount,
        isHotProduct: food.isHotProduct,
        isBudgetBite: food.isBudgetBite,
        isSpecialOffer: food.isSpecialOffer,
        isFeatured: food.isFeatured,
        isRecommended: food.isRecommended,
        itemType: food.itemType,
        variety: food.variety,
        variants: food.variants.map(v => ({
          name: v.name,
          size: v.size,
          price: v.price,
          priceAfterDiscount: food.discount > 0
            ? v.price - (v.price * food.discount / 100)
            : v.price
        }))
      });
    });

    // ✅ 4) Merge categories + foods (menu ready for UI)
    const menu = categories.map(cat => ({
      id: cat._id,
      title: cat.name,
      description: cat.description,
      image: cat.image?.[0],
      isFeatured: cat.isFeatured,
      isRecommended: cat.isRecommended,
      products: foodMap[cat._id.toString()] || []
    }));

    res.json({ success: true, menu });
  } catch (err) {
    console.error("Error fetching menu:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

//client side 

export const getUserFoods = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 12, 
      search = '', 
      category, 
      sortBy = 'createdAt', 
      sortOrder = -1,  // -1 for descending, 1 for ascending
      isHotProduct = false, 
      isRecommended = false, 
      isSpecialOffer = false,
    } = req.query;

    const skip = (page - 1) * limit;
    let foods = [];
    let totalFoods = 0;

    // Build category filter part of the query
    const categoryFilter = category ? { category } : {};

    // Build filters for special sections (Hot Products, Recommended, Special Offers)
    const specialFilters = {
      ...(isHotProduct && { isHotProduct: true }),
      ...(isRecommended && { isRecommended: true }),
      ...(isSpecialOffer && { isSpecialOffer: true }),
    };

    // Combine all filters into one query object
    const query = { 
      ...categoryFilter, 
      ...specialFilters,
    };

    // If search query exists, perform full-text search
    if (search) {
      const textQuery = {
        ...query,
        $text: { $search: search },
      };

      foods = await Food.find(textQuery)
        .populate('category', 'name') // Populate category name only
        .skip(Number(skip))
        .limit(Number(limit))
        .sort({ score: { $meta: 'textScore' }, [sortBy]: sortOrder })
        .select({ score: { $meta: 'textScore' } })
        .lean();

      totalFoods = await Food.countDocuments(textQuery);

      // Fallback to regex search if no matches found
      if (foods.length === 0) {
        const regexQuery = {
          ...query,
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { ingredients: { $regex: search, $options: 'i' } },
          ],
        };

        foods = await Food.find(regexQuery)
          .populate('category', 'name')
          .skip(Number(skip))
          .limit(Number(limit))
          .sort({ [sortBy]: sortOrder })
          .lean();

        totalFoods = await Food.countDocuments(regexQuery);
      }
    } else {
      // No search query, just fetch with other filters (category, hot products, etc.)
      foods = await Food.find(query)
        .populate('category', 'name')
        .skip(Number(skip))
        .limit(Number(limit))
        .sort({ [sortBy]: sortOrder })
        .lean();

      totalFoods = await Food.countDocuments(query);
    }

    // Apply priceAfterDiscount for each food variant
    foods = foods.map((food) => {
      food.variants = food.variants.map((variant) => {
        if (food.discount > 0) {
          variant.priceAfterDiscount =
            variant.price - variant.price * (food.discount / 100);
        } else {
          variant.priceAfterDiscount = variant.price;
        }
        return variant;
      });
      return food;
    });

    // Prepare pagination data
    const pagination = {
      total: totalFoods,
      page: Number(page),
      totalPages: Math.ceil(totalFoods / limit),
      limit: Number(limit),
    };

    // Respond with food data and pagination
    res.json({
      success: true,
      foods,
      pagination,
    });
  } catch (error) {
    console.error('Error fetching foods:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


export const getFood = async (req, res) => {
  try {
    const { foodId } = req.params;
    console.log('Fetching food item with ID:', foodId);

    // Validate if 'foodId' is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(foodId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid food item ID.',
      });
    }

    // Fetch the food item from the database, including category and createdBy data
    const food = await Food.findById(foodId)
      .populate('category', 'name')         // Populating the category field
      .populate('createdBy', 'userName')   // Populating the createdBy field to get userName
      .lean();                             // Use lean to return plain JavaScript objects
    console.log('Fetched food item:', food);
    // If food item is not found
    if (!food) {
      return res.status(404).json({
        success: false,
        message: 'Food item not found.',
      });
    }

    // Calculate the price after discount for each variant
    const foodWithDiscounts = food.variants.map(variant => {
      const priceAfterDiscount = food.discount > 0
        ? variant.price - (variant.price * (food.discount / 100))
        : variant.price;
      return {
        ...variant,
        priceAfterDiscount,
      };
    });

    // Return the found food item with the price after discount applied to variants
    res.status(200).json({
      success: true,
      food: {
        ...food, // Spread the food object to include its properties
        createdBy: food.createdBy ? food.createdBy.userName : null, // Show the userName of the creator
        variants: foodWithDiscounts, // Overwrite variants with the discounted ones
      },
    });
  } catch (error) {
    console.error('Error fetching food:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching the food item. Please try again later.',
    });
  }
};


export const updateFood = async (req, res) => {
  try {
    const { foodId } = req.params;
    let {
      name,
      description = "",
      ingredients = [],
      category,
      isHotProduct = false,
      isBudgetBite = false,
      isSpecialOffer = false,
      variants = [],
      isFeatured = false,
      isRecommended = false,
      status = "Active",
      cookTime = "",
      itemType = "",
      variety = "",
      discount = 0,
      removedImages = [],
    } = req.body;

    const files = req.files; // multer adds this

    // ✅ Parse JSON strings if they come as stringified arrays
    if (typeof variants === "string") {
      try {
        variants = JSON.parse(variants);
      } catch {
        return res.status(400).json({ success: false, message: "Invalid variants format." });
      }
    }
    if (typeof removedImages === "string") {
      try {
        removedImages = JSON.parse(removedImages);
      } catch {
        removedImages = [];
      }
    }

    // ✅ Validate required fields
    if (!name || !category) {
      return res.status(400).json({
        success: false,
        message: "Name and category are required.",
      });
    }

    // ✅ Process ingredients
    let ingredientArray = [];
    if (typeof ingredients === "string") {
      ingredientArray = ingredients.split(",").map((i) => i.trim());
    } else if (Array.isArray(ingredients)) {
      ingredientArray = ingredients;
    }

    // ✅ Validate variants
    if (!Array.isArray(variants)) {
      return res.status(400).json({
        success: false,
        message: "Variants must be an array.",
      });
    }

    // ✅ Find existing food
    const existingFood = await Food.findById(foodId);
    if (!existingFood) {
      return res.status(404).json({
        success: false,
        message: "Food item not found.",
      });
    }

    // ✅ Handle new file uploads
    let newImageUrls = [];
    if (files && files.length > 0) {
      for (const file of files) {
        try {
          const uploadResult = await cloudinary.uploader.upload(file.path, {
            folder: "food_images",
            resource_type: "image",
            transformation: [
              { width: 800, height: 800, crop: "limit" },
              { quality: "auto" },
              { fetch_format: "webp" },
            ],
          });
          newImageUrls.push(uploadResult.secure_url);
          fs.unlink(file.path, () => {}); // cleanup
        } catch (uploadErr) {
          console.error("❌ Cloudinary Upload Error:", uploadErr);
          return res.status(500).json({
            success: false,
            message: "Image upload failed. Please try again.",
          });
        }
      }
    }

    // ✅ Start with current images
    let finalImages = existingFood.foodImages || [];

    // Remove images that were flagged
    if (removedImages.length > 0) {
      finalImages = finalImages.filter((img) => !removedImages.includes(img));

      // Delete from cloudinary
      for (const imageUrl of removedImages) {
        const publicId = imageUrl.split("/").pop().split(".")[0];
        try {
          await cloudinary.uploader.destroy(`food_images/${publicId}`);
        } catch (err) {
          console.error("❌ Cloudinary Deletion Error:", err);
        }
      }
    }

    // Add new ones
    if (newImageUrls.length > 0) {
      finalImages = [...finalImages, ...newImageUrls];
    }

    // ✅ Build update object
    const updateData = {
      name,
      description,
      ingredients: ingredientArray,
      category,
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
      discount,
      foodImages: finalImages,
    };

    const updatedFood = await Food.findByIdAndUpdate(foodId, updateData, { new: true });

    return res.status(200).json({
      success: true,
      message: "Food item updated successfully.",
      food: updatedFood,
    });
  } catch (error) {
    console.error("❌ Error updating food:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while updating the food item.",
    });
  }
};
export const deleteFood = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the food item to get associated image URLs before deletion
    const food = await Food.findById(id).lean();

    // Check if the food item exists
    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Food item not found.",
      });
    }

    // Delete images from Cloudinary if there are any
    if (food.foodImages && food.foodImages.length > 0) {
      for (const imageUrl of food.foodImages) {
        // Regex to extract the public_id from Cloudinary URLs
        const regex = /\/upload\/(?:v\d+\/)?([^\.]+)/;
        const match = imageUrl.match(regex);

        if (match && match[1]) {
          const publicId = match[1]; // Extracted public_id
          try {
            // Deleting the image from Cloudinary using the public_id
            await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
            console.log(`Image ${publicId} deleted from Cloudinary.`);
          } catch (err) {
            console.error(`Error deleting image ${publicId} from Cloudinary:`, err);
            // Optionally, continue or decide if you want to return an error response
          }
        }
      }
    }

    // Now delete the food item from the database
    await Food.findByIdAndDelete(id);

    // Return a success response after deletion
    return res.json({
      success: true,
      message: "Food item and associated images deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting food:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting the food item. Please try again later.",
    });
  }
};


// Get foods by category
export const getFoodByCategory = async (req, res) => {
    try {
        const { category } = req.query;

        const foods = await Food.find({ category }).limit(12).leans();

        res.status(200).json({
            success: true,
            foods,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching foods by category.",
        });
    }
};
// Get the total number of food items
export const getTotalFood = async (req, res) => {
    try {
        const total = await Food.countDocuments();

        res.status(200).json({
            success: true,
            totalFood: total,
        });
    } catch (error) {
        console.error("Error fetching total foods:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch total food items.",
            error: error.message,
        });
    }
};
