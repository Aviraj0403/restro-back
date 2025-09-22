import Order from '../models/order.model'; // Import the Order model

export const createOrder = async (req, res) => {
  try {
    const { userId, items, shippingAddress, paymentMethod, discountCode, totalAmount } = req.body;

    if (!userId || !items || !shippingAddress || !paymentMethod || !totalAmount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if there are any items in the order
    if (items.length === 0) {
      return res.status(400).json({ message: 'Order must have at least one item' });
    }

    // Create new order
    const newOrder = new Order({
      user: userId, // Link the order to the user who placed it
      items: items, // List of items in the order
      shippingAddress: shippingAddress, // Shipping address, includes location and other details
      paymentMethod: paymentMethod, // Payment method: 'COD' or 'ONLINE'
      paymentStatus: 'Pending', // Initial payment status
      orderStatus: 'Pending', // Initial order status
      totalAmount: totalAmount, // Total order amount
      discountCode: discountCode, // Optional discount code
      isOfferApplied: !!discountCode, // If an offer was applied
      placedAt: new Date() // Timestamp of when the order was placed
    });

    // Save order to database
    await newOrder.save();

    // Respond with the saved order
    res.status(201).json({
      message: 'Order placed successfully',
      order: newOrder
    });

    // Emit the new order to the restaurant through Socket.IO (we'll trigger this part in the socket server)
    req.app.get('io').to(newOrder.restaurantId).emit('newOrder', newOrder); // Emit the order to the restaurant room

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Failed to place order', error: error.message });
  }
};
