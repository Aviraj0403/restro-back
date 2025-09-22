import { Server as socketIo } from 'socket.io';
import Order from './models/order.model.js'; // Import Order model

let io;

export const setupSocketIO = (server) => {
  io = new socketIo(server);

  io.on('connection', (socket) => {
    console.log('A user connected, SOCKET ID:', socket.id);

    // Listen for the 'newOrder' event from the client
    socket.on('newOrder', async (data) => {
      try {
        // Create a new order from the data
        const newOrder = new Order({
          user: data.userId,  // User who placed the order
          items: data.items,  // List of ordered items
          shippingAddress: data.shippingAddress,
          paymentMethod: data.paymentMethod,
          paymentStatus: 'Pending',  // Default as Pending
          orderStatus: 'Pending',   // Default as Pending
          totalAmount: data.totalAmount,
          discountAmount: data.discountAmount,
          discountCode: data.discountCode,
          placedAt: new Date(),
        });

        // Save the new order to the database
        await newOrder.save();
        console.log('New order saved:', newOrder);

        // Emit the new order event to all connected clients
        io.emit('newOrder', newOrder);
      } catch (error) {
        console.error('Error creating order:', error);
      }
    });

    // Handle client disconnection
    socket.on('disconnect', () => {
      console.log('A user disconnected');
    });
  });
};
