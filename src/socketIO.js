import { Server as socketIo } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import Order from "./models/order.model.js";

const secret = process.env.JWTSECRET;

const createRateLimiter = (capacity = 10, intervalMs = 10_000) => {
  let tokens = capacity;
  let lastRefill = Date.now();

  return () => {
    const now = Date.now();
    const elapsed = now - lastRefill;

    if (elapsed > intervalMs) {
      tokens = capacity;
      lastRefill = now;
    }

    if (tokens > 0) {
      tokens -= 1;
      return true;
    }
    return false;
  };
};

export const setupSocketIO = (server) => {
  const io = new socketIo(server, {
    cors: {
      origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "https://restro-admin-v1.vercel.app",
        "https://restaurant-tan-phi.vercel.app",
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("✅ Socket connected:", socket.id);

    const rawCookies = socket.handshake.headers?.cookie || "";
    const parsedCookies = cookie.parse(rawCookies);
    const token = parsedCookies.jwt;

    if (!token) {
      console.log("❌ JWT token missing");
      return socket.disconnect();
    }

    try {
      const decoded = jwt.verify(token, secret);
      if (!decoded?.data) {
        return socket.disconnect();
      }

      socket.user = decoded.data;
    } catch (err) {
      console.error("❌ JWT verification failed:", err.message);
      return socket.disconnect();
    }

    const allow = createRateLimiter(20, 10_000);

    socket.on("newOrder", async (data, callback) => {
      try {
        if (!allow()) {
          return callback?.({ success: false, error: "Rate limit exceeded" });
        }

        const {
          items,
          shippingAddress,
          paymentMethod,
          totalAmount,
          discountCode = null,
          discountAmount = 0,
        } = data;

        const userId = socket.user.id;

        if (!Array.isArray(items) || items.length === 0) {
          return callback?.({ success: false, error: "Order must contain items" });
        }
        if (!shippingAddress) {
          return callback?.({ success: false, error: "Shipping address is required" });
        }
        if (!["COD", "ONLINE"].includes(paymentMethod)) {
          return callback?.({ success: false, error: "Invalid payment method" });
        }
        if (typeof totalAmount !== "number" || totalAmount <= 0) {
          return callback?.({ success: false, error: "Invalid total amount" });
        }

        const newOrder = new Order({
          user: userId,
          items,
          shippingAddress,
          paymentMethod,
          paymentStatus: "Pending",
          orderStatus: "Pending",
          totalAmount,
          discountAmount,
          discountCode,
          placedAt: new Date(),
        });

        // Optional: await newOrder.save();

        io.emit("newOrder", newOrder);
        callback?.({ success: true, order: newOrder });
      } catch (err) {
        console.error("❌ newOrder error:", err.message);
        callback?.({ success: false, error: "Something went wrong" });
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected:", socket.id);
    });
  });

  return io; // 👈 Return so it can be attached to app in server.js
};
