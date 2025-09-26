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

    const query = {};

    // 🔹 Filter by status
    if (status) {
      query.orderStatus = status;
    }

    // 🔹 Filter by user
    if (userId) {
      query.user = userId;
    }

    // 🔹 Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // 🔹 Basic search (on discountCode or user name/email)
    if (search) {
      query.$or = [
        { discountCode: { $regex: search, $options: "i" } },
      ];
    }

    // Pagination
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Number(limit))
        .populate("user", "name email")
        .populate("items.food", "name foodImages price")
        .populate("offerApplied", "name code discountPercentage"),
      Order.countDocuments(query),
    ]);

    res.status(200).json({
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      limit: Number(limit),
      orders,
    });
  } catch (err) {
    console.error("❌ Get all orders error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


export const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate("items.food", "name foodImages price")
      .populate("offerApplied", "name code discountPercentage");
    res.status(200).json(orders);
  } catch (err) {
    console.error("❌ Get user orders error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate("items.food", "name foodImages price")
      .populate("offerApplied", "name code discountPercentage");

    if (!order) return res.status(404).json({ message: "Order not found" });

    // Ensure user can only view their own order (unless admin)
    if (order.user._id.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.status(200).json(order);
  } catch (err) {
    console.error("❌ Get order by ID error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Update order status (admin/super admin only)
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["Pending", "Processing", "Shipped", "Delivered", "Cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus: status },
      { new: true }
    );

    if (!order) return res.status(404).json({ message: "Order not found" });

    const io = req.app.get("io");
    if (io) io.emit("orderUpdated", order);

    res.status(200).json({ message: "Order status updated", order });
  } catch (err) {
    console.error("❌ Update order status error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Cancel order (user)
 */
export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to cancel this order" });
    }

    if (["Shipped", "Delivered"].includes(order.orderStatus)) {
      return res.status(400).json({ message: "Cannot cancel shipped/delivered order" });
    }

    order.orderStatus = "Cancelled";
    await order.save();

    const io = req.app.get("io");
    if (io) io.emit("orderCancelled", order);

    res.status(200).json({ message: "Order cancelled", order });
  } catch (err) {
    console.error("❌ Cancel order error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

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
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayOrders = await Order.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    })
      .populate("user", "name email")
      .populate("items.food", "name foodImages price");

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
    const totalOrders = await Order.countDocuments();
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
export const getWeeklyOrderStats = async (req, res, next) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 6); // include today

    const match = { placedAt: { $gte: sevenDaysAgo, $lte: now } };

    // ✅ agar restaurant owner h to filter karo
    if (req.user.role === "restaurantOwner") {
      match.restaurant = new mongoose.Types.ObjectId(req.user.restaurantId);
    }

    const stats = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$placedAt" } },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({ success: true, stats });
  } catch (err) {
    next(err);
  }
};

// 📊 Monthly stats (last 12 months)
export const getMonthlyOrderStats = async (req, res, next) => {
  try {
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    const match = { placedAt: { $gte: oneYearAgo, $lte: now } };

    // ✅ agar restaurant owner h to filter karo
    if (req.user.role === "restaurantOwner") {
      match.restaurant = new mongoose.Types.ObjectId(req.user.restaurantId);
    }

    const stats = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$placedAt" } },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({ success: true, stats });
  } catch (err) {
    next(err);
  }
};
