import { Server as socketIo } from 'socket.io';
import Order from './models/order.model.js';

let io;

export const setupSocketIO = (server) => {
  io = new socketIo(server, {
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

  // Make `io` accessible inside Express routes
  server.setMaxListeners(20);
  server.on("request", (req, res) => req.app?.set("io", io));

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('newOrder', async (data, callback) => {
      try {
        const newOrder = new Order({
          user: data.userId,
          items: data.items,
          shippingAddress: data.shippingAddress,
          paymentMethod: data.paymentMethod,
          paymentStatus: 'Pending',
          orderStatus: 'Pending',
          totalAmount: data.totalAmount,
          discountAmount: data.discountAmount || 0,
          discountCode: data.discountCode || null,
          placedAt: new Date(),
        });

        await newOrder.save();

        // Broadcast to admins/kitchen dashboard
        io.emit('newOrder', newOrder);

        // Acknowledge to the client
        callback({ success: true, order: newOrder });
      } catch (err) {
        console.error("Error saving order:", err);
        callback({ success: false, error: err.message });
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });
};
