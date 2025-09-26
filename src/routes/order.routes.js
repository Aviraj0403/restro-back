import express from 'express';
import {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  deleteOrder,
  getTodayOrders,
  getTotalOrders,
  getWeeklyOrderStats,
  getMonthlyOrderStats
} from '../controllers/order.controller.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();

router.post('/createOrder', verifyToken, createOrder);
router.get("/myorders", verifyToken, getUserOrders);
router.get("/ getOrderById/:id", verifyToken, getOrderById);
router.put("/cancelOrder/:id", verifyToken, cancelOrder);

// Admin routes
router.get("/getAllOrders", verifyToken, getAllOrders); // add admin middleware if needed
router.put("/updateOrderStatus/:id", verifyToken, updateOrderStatus);
router.delete("/deleteOrder/:id", verifyToken, deleteOrder);

router.get("/reports/today", verifyToken, getTodayOrders);
router.get("/reports/total", verifyToken, getTotalOrders);

router.get("/stats/weekly", verifyToken, getWeeklyOrderStats);
router.get("/stats/monthly", verifyToken, getMonthlyOrderStats);


export default router;
