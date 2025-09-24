import { Server as socketIo } from 'socket.io';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import Order from './models/order.model.js';

// Use your existing JWT secret
const secret = process.env.JWTSECRET;

// Optional: simple token bucket rate limiter
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
        'http://localhost:5173',
        'http://localhost:5174',
        'https://restro-admin-v1.vercel.app',
        'https://restaurant-tan-phi.vercel.app',
      ],
      methods: ['GET', 'POST'],
      credentials: true,
    }
  });

  server.setMaxListeners(20);
  server.on("request", (req, res) => req.app?.set("io", io));

  io.on('connection', (socket) => {
    console.log('✅ Socket connected:', socket.id);

    // 🔍 Extract JWT from cookies
    const rawCookies = socket.handshake.headers?.cookie || "";
    const parsedCookies = cookie.parse(rawCookies);
    const token = parsedCookies.jwt;
     console.log('🔑 Extracted JWT:', token)
    if (!token) {
      console.log('❌ JWT token missing in cookie');
      return socket.disconnect();
    }

    try {
      // 🔐 Verify the JWT token (same as your `verifyToken` middleware)
      const decoded = jwt.verify(token, secret);

      if (!decoded?.data) {
        console.log('❌ JWT payload invalid');
        return socket.disconnect();
      }

      // ✅ Attach authenticated user data to socket
      socket.user = decoded.data;
      console.log('🔓 Authenticated socket user:', socket.user);

    } catch (err) {
      console.error('❌ JWT verification failed:', err.message);
      return socket.disconnect();
    }

    // 🛡 Add rate limiter for 'newOrder'
    const allow = createRateLimiter(20, 10_000);

    // 🛒 Handle order placement
    socket.on('newOrder', async (data, callback) => {
      try {
        if (!allow()) {
          return callback?.({ success: false, error: 'Rate limit exceeded' });
        }

        const { items, shippingAddress, paymentMethod, totalAmount, discountCode = null, discountAmount = 0 } = data;
        const userId = socket.user.id;

        console.log('📦 Incoming Order:', {
          userId,
          items,
          shippingAddress,
          paymentMethod,
          totalAmount,
        });

        // 🔍 Basic validations
        if (!Array.isArray(items) || items.length === 0) {
          return callback?.({ success: false, error: 'Order must contain items' });
        }
        if (!shippingAddress) {
          return callback?.({ success: false, error: 'Shipping address is required' });
        }
        if (!['COD', 'ONLINE'].includes(paymentMethod)) {
          return callback?.({ success: false, error: 'Invalid payment method' });
        }
        if (typeof totalAmount !== 'number' || totalAmount <= 0) {
          return callback?.({ success: false, error: 'Invalid total amount' });
        }

        // 📝 Create Order
        const newOrder = new Order({
          user: userId,
          items,
          shippingAddress,
          paymentMethod,
          paymentStatus: 'Pending',
          orderStatus: 'Pending',
          totalAmount,
          discountAmount,
          discountCode,
          placedAt: new Date(),
        });

        await newOrder.save();

        // 📣 Broadcast new order to admins/kitchen
        io.emit('newOrder', newOrder);

        // ✅ Acknowledge to client
        callback?.({ success: true, order: newOrder });
      } catch (err) {
        console.error('❌ Order save failed:', err.message);
        callback?.({ success: false, error: 'Something went wrong' });
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected:', socket.id);
    });
  });

  return io;
};
