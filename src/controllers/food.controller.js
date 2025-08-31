import Food from "../models/food.model.js";
import cloudinary from '../config/cloudinaryConfig.js';  // Assuming Cloudinary is configured
import fs from 'fs';
import { uploadMultipleImagesToCloudinary, deleteImagesByUrlsFromCloudinary, uploadSingleImageToCloudinary } from './imageUploadController.js'; // Image upload helper
import redis from 'redis';
import { promisify } from 'util';
import { clearAllRedisCache } from '../services/redis.service.js'; // Import Redis cache clearing function
const client = redis.createClient();
const getAsync = promisify(client.get).bind(client);
import mongoose from 'mongoose';

// export const createFood = async (req, res) => {
//     try {
//         const {
//             name,
//             description,
//             ingredients,
//             category,
//             foodImages, // This will be an array of file paths or image data
//             isHotProduct = false,
//             isBudgetBite = false,
//             isSpecialOffer = false,
//             variants,
//             isFeatured = false,
//             isRecommended = false,
//             status = "Active",
//             cookTime,
//             itemType,
//             variety,
//             createdBy,
//             discount = 0
//         } = req.body;

//         // Validate required fields
//         if (!name || !category) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Missing required fields: name and category."
//             });
//         }

//         // Handle image upload if foodImages are provided
//         let imageUrls = [];
//         if (foodImages && foodImages.length > 0) {
//             // Ensure that foodImages are properly uploaded and we have the URLs
//             imageUrls = await uploadMultipleImagesToCloudinary(foodImages); // This returns an array of URLs
//         }

//         // Create a new food item with the uploaded image URLs
//         const newFood = await Food.create({
//             name,
//             description,
//             ingredients,
//             category,
//             foodImages: imageUrls, // Attach the uploaded image URLs here
//             isHotProduct,
//             isBudgetBite,
//             isSpecialOffer,
//             variants,
//             isFeatured,
//             isRecommended,
//             status,
//             cookTime,
//             itemType,
//             variety,
//             createdBy,
//             discount,
//         });

//         // Return success response with the newly created food item
//         res.status(201).json({
//             success: true,
//             message: "Food item created successfully.",
//             food: newFood,
//         });
//     } catch (error) {
//         console.error("Error creating food item:", error);
//         res.status(500).json({
//             success: false,
//             message: "Internal server error occurred while creating the food item.",
//         });
//     }
// };
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
// export const createFood = async (req, res) => {
//   try {
//     console.log('Request Body:', req.body);
    
//     const {
//       name,
//       description,
//       ingredients,
//       category,
//       isHotProduct = false,
//       isBudgetBite = false,
//       isSpecialOffer = false,
//       variants,
//       isFeatured = false,
//       isRecommended = false,
//       status = "Active",
//       cookTime,
//       itemType,
//       variety,
//       createdBy = "aviraj",  // Expect ObjectId, not a string like "admin"
//       discount = 0
//     } = req.body;

//     const foodImages = req.files;  // Getting the uploaded files from the `multer` middleware

//     // Log the files to see what is coming through
//     console.log('Food Images:', foodImages);

//     // Validate required fields
//     if (!name || !category) {
//       console.log('Validation Failed: Missing name or category');
//       return res.status(400).json({
//         success: false,
//         message: "Missing required fields: name and category."
//       });
//     }

//     // Validate variants (it should be an array of objects)
//     if (variants && !Array.isArray(variants)) {
//       console.log('Validation Failed: Invalid variants format');
//       return res.status(400).json({
//         success: false,
//         message: "Variants should be an array of objects."
//       });
//     }

//     // Validate createdBy (check if it's a valid ObjectId)
//     if (!mongoose.Types.ObjectId.isValid(createdBy)) {
//       console.log('Validation Failed: Invalid createdBy ObjectId');
//       return res.status(400).json({
//         success: false,
//         message: "Invalid createdBy ObjectId."
//       });
//     }

//     // Handle image upload if foodImages are provided
//     let imageUrls = [];
//     if (foodImages && foodImages.length > 0) {
//       console.log('Food images provided:', foodImages);

//       try {
//         imageUrls = await uploadMultipleImagesToCloudinary(foodImages); // This returns an array of URLs
//         console.log('Uploaded image URLs:', imageUrls);
//       } catch (uploadError) {
//         console.error('Error uploading images to Cloudinary:', uploadError);
//         return res.status(500).json({
//           success: false,
//           message: "Failed to upload images to Cloudinary.",
//         });
//       }
//     } else {
//       console.log('No food images provided.');
//     }

//     // Ensure itemType and variety are within the allowed enum values
//     const validItemTypes = ['Veg', 'Non-Veg'];
//     const validVarieties = ['Breakfast', 'Lunch', 'Dinner'];

//     if (itemType && !validItemTypes.includes(itemType)) {
//       return res.status(400).json({
//         success: false,
//         message: `Invalid itemType. Allowed values are: ${validItemTypes.join(', ')}`
//       });
//     }

//     if (variety && !validVarieties.includes(variety)) {
//       return res.status(400).json({
//         success: false,
//         message: `Invalid variety. Allowed values are: ${validVarieties.join(', ')}`
//       });
//     }

//     // Create a new food item with the uploaded image URLs
//     console.log('Creating food item...');
//     const newFood = await Food.create({
//       name,
//       description,
//       ingredients,
//       category,
//       imageUrls,  // Attach the uploaded image URLs here
//       isHotProduct,
//       isBudgetBite,
//       isSpecialOffer,
//       variants,
//       isFeatured,
//       isRecommended,
//       status,
//       cookTime,
//       itemType,
//       variety,
//       createdBy,
//       discount,
//     });

//     console.log('Food item created:', newFood);

//     // Return success response with the newly created food item
//     res.status(201).json({
//       success: true,
//       message: "Food item created successfully.",
//       food: newFood,
//     });
//   } catch (error) {
//     console.error('Error creating food item:', error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error occurred while creating the food item.",
//     });
//   }
// };

//redis
export const getAllFood = async (req, res) => {
    try {
        const { page = 1, limit = 12, search = "", category } = req.query;
        const skip = (page - 1) * limit;
        const cacheKey = `foods:${category || 'all'}:${search}:${page}:${limit}`;

        // Check cache
        const cachedData = await getAsync(cacheKey);
        if (cachedData) {
            console.log('Fetching data from cache');
            return res.json(JSON.parse(cachedData));
        }

        // MongoDB aggregation pipeline
        let aggregationPipeline = [
            { $match: category ? { category } : {} },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $project: {
                    score: { $meta: 'textScore' },
                    name: 1,
                    description: 1,
                    foodImages: 1,
                    category: 1
                }
            }
        ];

        if (search) {
            aggregationPipeline.unshift({
                $match: {
                    $text: { $search: search }
                }
            });
        }

        const foods = await Food.aggregate(aggregationPipeline).lean();

        const totalFoods = await Food.countDocuments({
            ...category ? { category } : {},
            $text: { $search: search }
        });

        const pagination = {
            total: totalFoods,
            page: Number(page),
            totalPages: Math.ceil(totalFoods / limit),
            limit: Number(limit),
        };

        const responseData = { success: true, foods, pagination };

        // Cache the result for 1 hour
        client.setex(cacheKey, 3600, JSON.stringify(responseData));

        return res.json(responseData);
    } catch (error) {
        console.error('Error fetching foods:', error);
        return res.status(500).json({ success: false, message: 'Internal server error occurred.' });
    }
};

export const createFood = async (req, res) => {
  try {
    console.log('Request Body:', req.body);
    
    const {
      name,
      description,
      ingredients,
      category,
      isHotProduct = false,
      isBudgetBite = false,
      isSpecialOffer = false,
      variants,  // Keep as a stringified JSON array from the request body
      isFeatured = false,
      isRecommended = false,
      status = "Active",
      cookTime,
      itemType,
      variety,
      createdBy = "aviraj",  // Expect ObjectId, not a string like "admin"
      discount = 0
    } = req.body;

    const foodImages = req.files;  // Getting the uploaded files from the `multer` middleware

    // Validate required fields
    if (!name || !category) {
      console.log('Validation Failed: Missing name or category');
      return res.status(400).json({
        success: false,
        message: "Missing required fields: name and category."
      });
    }

    // Parse variants string to array of objects
    let parsedVariants = [];
    if (variants) {
      try {
        parsedVariants = JSON.parse(variants);
      } catch (error) {
        console.log('Invalid variants format:', error);
        return res.status(400).json({
          success: false,
          message: "Invalid variants format. Please ensure it's a valid JSON array."
        });
      }
    }

    // Validate variants (it should be an array of objects)
    if (parsedVariants && !Array.isArray(parsedVariants)) {
      console.log('Validation Failed: Invalid variants format');
      return res.status(400).json({
        success: false,
        message: "Variants should be an array of objects."
      });
    }

    // Handle image upload if foodImages are provided
    let imageUrls = [];
    if (foodImages && foodImages.length > 0) {
      console.log('Food images provided:', foodImages);

      try {
        imageUrls = await uploadMultipleImagesToCloudinary(foodImages); // This returns an array of URLs
        console.log('Uploaded image URLs:', imageUrls);
      } catch (uploadError) {
        console.error('Error uploading images to Cloudinary:', uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to upload images to Cloudinary.",
        });
      }
    } else {
      console.log('No food images provided.');
    }

    // Create a new food item with the uploaded image URLs
    console.log('Creating food item...');
    const newFood = await Food.create({
      name,
      description,
      ingredients: ingredients.split(','),  // Assuming ingredients are comma-separated
      category,
      imageUrls,  // Attach the uploaded image URLs here
      isHotProduct,
      isBudgetBite,
      isSpecialOffer,
      variants: parsedVariants,  // Use the parsed variants
      isFeatured,
      isRecommended,
      status,
      cookTime,
      itemType,
      variety,
      createdBy,
      discount,
    });

    console.log('Food item created:', newFood);

    // Return success response with the newly created food item
    res.status(201).json({
      success: true,
      message: "Food item created successfully.",
      food: newFood,
    });
  } catch (error) {
    console.error('Error creating food item:', error);
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while creating the food item.",
    });
  }
};

// export const getAllFood = async (req, res) => {
//   try {
//     const { page = 1, limit = 12, search = "", category } = req.query;
//     const skip = (page - 1) * limit;

//     // Build category filter if category is provided
//     const categoryFilter = category ? { category } : {};

//     let foods = [];
//     let totalFoods = 0;

//     if (search) {
//       // Full-text search first
//       const textQuery = {
//         ...categoryFilter,
//         $text: { $search: search },
//       };

//       foods = await Food.find(textQuery)
//         .populate("category")
//         .skip(Number(skip))
//         .limit(Number(limit))
//         .sort({ score: { $meta: "textScore" }, createdAt: -1 })
//         .select({ score: { $meta: "textScore" } })
//         .lean();

//       totalFoods = await Food.countDocuments(textQuery);

//       // Fallback to regex search if no matches found
//       if (foods.length === 0) {
//         const regexQuery = {
//           ...categoryFilter,
//           $or: [
//             { name: { $regex: search, $options: "i" } },
//             { description: { $regex: search, $options: "i" } },
//           ],
//         };

//         foods = await Food.find(regexQuery)
//           .populate("category")
//           .skip(Number(skip))
//           .limit(Number(limit))
//           .sort({ createdAt: -1 });

//         totalFoods = await Food.countDocuments(regexQuery);
//       }
//     } else {
//       // No search, just category or all food items
//       const query = { ...categoryFilter };

//       foods = await Food.find(query)
//         .populate("category")
//         .skip(Number(skip))
//         .limit(Number(limit))
//         .sort({ createdAt: -1 });

//       totalFoods = await Food.countDocuments(query);
//     }

//     res.json({
//       success: true,
//       foods,
//       pagination: {
//         total: totalFoods,
//         page: Number(page),
//         totalPages: Math.ceil(totalFoods / limit),
//         limit: Number(limit),
//       },
//     });
//   } catch (error) {
//     console.error("Error fetching foods:", error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// Get a single food item by its ID
export const getFood = async (req, res) => {
    try {
        const { id } = req.params;
        const food = await Food.findById(id).populate("category").lean();

        if (!food) {
            return res.status(404).json({
                success: false,
                message: "Food item not found.",
            });
        }

        res.status(200).json({
            success: true,
            food,
        });
    } catch (error) {
        console.error("Error fetching food:", error);
        res.status(500).json({
            success: false,
            message: "An error occurred while fetching the food item. Please try again later.",
        });
    }
};

export const updateFood = async (req, res) => {
  try {
    const { foodId } = req.params;
    const {
      name,
      description,
      ingredients,
      category,
      imageUrls,
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
    } = req.body;

    // Build update object
    const updateData = {
      name,
      description,
      ingredients,
      category,
      imageUrls,
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
    };

    // Update the food document in the database
    const updatedFood = await Food.findByIdAndUpdate(foodId, updateData, { new: true });

    if (!updatedFood) {
      return res.status(404).json({
        success: false,
        message: "Food item not found.",
      });
    }

    // Clear Redis cache after the food item update
    await clearAllRedisCache();

    return res.status(200).json({
      success: true,
      message: "Food item updated successfully.",
      food: updatedFood,
    });
  } catch (error) {
    console.error("Error updating food:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while updating the food item.",
    });
  }
};

// Delete food item by ID
export const deleteFood = async (req, res) => {
    try {
        const { id } = req.params;

        const food = await Food.findById(id).lean();

        if (!food) {
            return res.status(404).json({
                success: false,
                message: "Food item not found.",
            });
        }

        // Delete food item from the database
        await Food.findByIdAndDelete(id);
        await clearAllRedisCache();
        return res.json({
            success: true,
            message: "Food item deleted successfully.",
        });
    } catch (error) {
        console.error("Error deleting food:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while deleting the food item.",
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
