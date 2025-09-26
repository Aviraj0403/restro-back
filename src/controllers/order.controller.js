import Order from '../models/order.model.js'; 

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

    // Basic validations
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Order items are required" });
    }

    if (!shippingAddress) {
      return res.status(400).json({ message: "Shipping address is required" });
    }

    if (!paymentMethod || !["COD", "ONLINE"].includes(paymentMethod)) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    if (!totalAmount || typeof totalAmount !== "number") {
      return res.status(400).json({ message: "Invalid total amount" });
    }

    // Create and save the order
    const newOrder = new Order({
      user: userId,
      items,
      shippingAddress,
      paymentMethod,
      paymentStatus: paymentMethod === "COD" ? "Pending" : "Paid",
      orderStatus: "Pending",
      totalAmount,
      discountCode,
      placedAt: new Date(),
    });

// After saving the order, you can assign it to a variable so you send the fully saved doc with _id
const savedOrder = await newOrder.save();

const io = req.app.get("io");
if (io) {
  console.log("📡 Emitting newOrder event via Socket.IO", savedOrder._id );
  io.emit("newOrder", savedOrder); // Send the saved order with _id and timestamps if any
}

return res.status(201).json({ message: "Order placed", order: savedOrder });


  } catch (err) {
    console.error("❌ Order creation error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};


