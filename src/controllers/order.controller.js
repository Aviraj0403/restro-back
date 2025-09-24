import Order from '../models/order.model.js'; 
export const createOrder = async (req, res) => {
  try {
    const { userId, items, shippingAddress, paymentMethod, discountCode, totalAmount } = req.body;

    if (!userId || !items || !shippingAddress || !paymentMethod || !totalAmount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (items.length === 0) {
      return res.status(400).json({ message: 'Order must have at least one item' });
    }

    // Create new order
    const newOrder = new Order({
      user: userId,
      items,
      shippingAddress,
      paymentMethod,
      paymentStatus: 'Pending',
      orderStatus: 'Pending',
      totalAmount,
      discountCode: discountCode || null,
      isOfferApplied: !!discountCode,
      placedAt: new Date(),
    });

    // console.log("📝 Saving new order:", newOrder);
    await newOrder.save();

    // Respond to customer
    res.status(201).json({
      message: '✅ Order placed successfully',
      order: newOrder,
    });

    // Emit to sockets (admins, restaurant dashboards, etc.)
    const io = req.app.get('io');
    if (io) {
      io.emit('newOrder', newOrder);
      console.log("📡 Socket emitted new order:", newOrder._id);
    }

  } catch (error) {
    console.error('❌ Error creating order:', error);
    res.status(500).json({ message: 'Failed to place order', error: error.message });
  }
};

