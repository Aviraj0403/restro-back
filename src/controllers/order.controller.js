import Order from "../models/order.model.js";
import Offer from "../models/offer.model.js"; // if discount/offer applied
import mongoose from "mongoose";
import Food from "../models/food.model.js";

export const createOrder = async (req, res) => {
  try {
    const {
      items,
      shippingAddress,
      paymentMethod,
      discountCode = null,
      totalAmount,
    } = req.body;

    const userId = req.user.id;

    // 🔹 1. Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Order items are required" });
    }

    // 🔹 3. Validate payment method
    if (!paymentMethod || !["COD", "ONLINE"].includes(paymentMethod)) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    // 🔹 4. Validate total amount
    if (!totalAmount || typeof totalAmount !== "number") {
      return res.status(400).json({ message: "Invalid total amount" });
    }

    // 🔹 5. Handle discount / offer (optional)
    let discountAmount = 0;
    let appliedDiscountPercentage = 0;
    let offerApplied = null;
    let isOfferApplied = false;

    if (discountCode) {
      const offer = await Offer.findOne({ code: discountCode, status: "ACTIVE" });

      if (offer) {
        appliedDiscountPercentage = offer.discountPercentage;
        discountAmount = Math.min(
          (totalAmount * appliedDiscountPercentage) / 100,
          offer.maxDiscountAmount || totalAmount
        );
        offerApplied = offer._id;
        isOfferApplied = true;
      }
    }
 const populatedItems = await Promise.all(items.map(async (item) => {
  const food = await Food.findById(item.food).select('name');  // Fetch food name using the food ID
  return {
    ...item,
    selectedVariant: {
      ...item.selectedVariant,
      name: food ? food.name : 'Unknown Food Item',  // Add food name to selectedVariant
    },
  };
}));

    // console.log("Populated Items:", populatedItems);
    // 🔹 6. Create new order
    const newOrder = new Order({
      user: userId,
      items: populatedItems,
      shippingAddress,
      paymentMethod,
      paymentStatus: paymentMethod === "COD" ? "Pending" : "Paid",
      orderStatus: "Pending",
      totalAmount,
      discountAmount,
      discountCode,
      offerApplied,
      isOfferApplied,
      appliedDiscountPercentage,
      placedAt: new Date(),
    });

    const savedOrder = await newOrder.save();

    // 🔹 7. Emit socket event for real-time dashboards
    const io = req.app.get("io");
    if (io) {
      io.emit("newOrder", savedOrder);
    }

    return res.status(201).json({
      message: "Order placed successfully",
      order: savedOrder,
    });
  } catch (err) {
    console.error("❌ Order creation error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get all orders with filtering & pagination (admin/super admin)
 * Query params: page, limit, status, userId, startDate, endDate, search
 */
export const getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      userId,
      startDate,
      endDate,
      search,
    } = req.query;

    // Constructing query object for filtering
    const query = {};

    // Apply filters
    if (status) {
      query.orderStatus = status;
    }

    if (userId) {
      query.user = userId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { discountCode: { $regex: search, $options: "i" } },
        { 'user.name': { $regex: search, $options: "i" } },  // Search by user name
        { 'user.email': { $regex: search, $options: "i" } }, // Or by user email
      ];
    }

    // Pagination setup
    const skip = (page - 1) * limit;
    const limitNum = Number(limit);

    // Fetch orders with filtering, pagination, and populate
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate("user", "name email")
      .populate("items.food", "name foodImages price")
      .populate("offerApplied", "name code discountPercentage")
      .lean();  // Ensure we get plain objects (no Mongoose methods)

    const total = await Order.countDocuments(query);

    // Safely process the populated data to ensure no undefined errors
    const formattedOrders = orders.map(order => {
      return {
        ...order,
        items: order.items.map(item => {
          return {
            ...item,
            food: item.food || {},  // Ensure food is never undefined
            selectedVariant: item.selectedVariant || {},  // Ensure selectedVariant is never undefined
          };
        }),
      };
    });

    // Send back the response with pagination details
    res.status(200).json({
      total,
      page: Number(page),
      pages: Math.ceil(total / limitNum),
      limit: limitNum,
      orders: formattedOrders,
    });
  } catch (err) {
    console.error("❌ Get all orders error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all orders of a user
export const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate("items.food", "name foodImages price")
      .populate("offerApplied", "name code discountPercentage")
      .lean();  // Using lean to improve performance

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "No orders found for this user" });
    }

    res.status(200).json(orders);
  } catch (err) {
    console.error("❌ Get user orders error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get a single order by ID
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate("items.food", "name foodImages price")
      .populate("offerApplied", "name code discountPercentage")
      .lean();  // Use lean for better performance

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Authorization check: Only the user who placed the order or an admin can access it
    if (order.user._id.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ message: "Not authorized to access this order" });
    }

    res.status(200).json(order);
  } catch (err) {
    console.error("❌ Get order by ID error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update order status (admin only)
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    // Validate status
    const validStatuses = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus: status },
      { new: true }
    ).lean();  // Use lean to get a plain JS object for better performance

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Emit socket event if connected
    const io = req.app.get("io");
    if (io) io.emit("orderUpdated", order);

    res.status(200).json({ message: "Order status updated", order });
  } catch (err) {
    console.error("❌ Update order status error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Cancel order (user)
export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Ensure the user is authorized to cancel the order
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to cancel this order" });
    }

    // Ensure the order is not already shipped or delivered
    if (["Shipped", "Delivered"].includes(order.orderStatus)) {
      return res.status(400).json({ message: "Cannot cancel a shipped or delivered order" });
    }

    // Update the order status to cancelled
    order.orderStatus = "Cancelled";
    await order.save();

    // Emit socket event if connected
    const io = req.app.get("io");
    if (io) io.emit("orderCancelled", order);

    res.status(200).json({ message: "Order cancelled", order });
  } catch (err) {
    console.error("❌ Cancel order error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete order (admin only)
export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({ message: "Order deleted successfully" });
  } catch (err) {
    console.error("❌ Delete order error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * Get today's orders
 */
export const getTodayOrders = async (req, res) => {
  try {
    // Get the start and end of the day in UTC
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch orders created today
    const todayOrders = await Order.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    })
      .populate("user", "name email")
      .populate("items.food", "name foodImages price")
      .lean(); // Use .lean() for better performance

    // Calculate total revenue for today
    const totalAmount = todayOrders.reduce((sum, order) => sum + order.totalAmount, 0);

    res.status(200).json({
      count: todayOrders.length,
      totalAmount,
      orders: todayOrders,
    });
  } catch (err) {
    console.error("❌ Get today orders error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


/**
 * Get total orders (and revenue)
 */
export const getTotalOrders = async (req, res) => {
  try {
    // Get total orders count
    const totalOrders = await Order.countDocuments();

    // Aggregate to calculate total revenue
    const result = await Order.aggregate([
      { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } }
    ]);

    const totalRevenue = result.length > 0 ? result[0].totalRevenue : 0;

    res.status(200).json({
      totalOrders,
      totalRevenue,
    });
  } catch (err) {
    console.error("❌ Get total orders error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



// 📊 Weekly stats (last 7 days)
export const getWeeklyOrderStats = async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 6); // Include today

    // Build match condition for restaurant owner filter (if applicable)
    const match = { placedAt: { $gte: sevenDaysAgo, $lte: now } };

    if (req.user.role === "restaurantOwner") {
      match.restaurant = new mongoose.Types.ObjectId(req.user.restaurantId);
    }

    // Aggregate weekly stats
    const stats = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$placedAt" } },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } }, // Sort by date
    ]);

    res.status(200).json({ success: true, stats });
  } catch (err) {
    console.error("❌ Get weekly order stats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// 📊 Monthly stats (last 12 months)
export const getMonthlyOrderStats = async (req, res) => {
  try {
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1); // Get the date from 12 months ago

    // Build match condition for restaurant owner filter (if applicable)
    const match = { placedAt: { $gte: oneYearAgo, $lte: now } };

    if (req.user.role === "restaurantOwner") {
      match.restaurant = new mongoose.Types.ObjectId(req.user.restaurantId);
    }

    // Aggregate monthly stats
    const stats = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$placedAt" } },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } }, // Sort by date
    ]);

    res.status(200).json({ success: true, stats });
  } catch (err) {
    console.error("❌ Get monthly order stats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

