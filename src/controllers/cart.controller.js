import Cart from '../models/cart.model.js';
import Food from '../models/food.model.js';

/**
 * @desc Get current user's cart
 * @route GET /api/cart
 * @access Private
 */
export const getUserCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id })
      .populate('items.food', 'name foodImages variants discount');

    if (!cart) {
      return res.status(200).json({
        success: true,
        cartItems: [],
        totalPrice: 0,
      });
    }

    // Map items properly
    const cartItems = cart.items.map(item => {
      const food = item.food;
      const variant = item.selectedVariant;
      const price = variant.priceAfterDiscount ?? variant.price;

      return {
        foodId: food._id,
        name: food.name,
        image: food.foodImages[0],
        selectedVariant: variant,
        quantity: item.quantity,
        price,
        subTotal: price * item.quantity,
      };
    });

    res.status(200).json({
      success: true,
      cartItems,
      totalPrice: cart.totalPrice,
      updatedAt: cart.updatedAt,
    });
  } catch (error) {
    console.error('Get Cart Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get cart' });
  }
};


/**
 * @desc Add or update item in cart
 * @route POST /api/cart
 * @access Private
 */
export const addToCart = async (req, res) => {
  try {
    const { foodId, selectedVariant, quantity } = req.body;

    if (!foodId || !selectedVariant || !quantity || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid input' });
    }

    // Ensure selectedVariant has a name
    if (!selectedVariant.name) {
      selectedVariant.name = selectedVariant.size;  // Default to size if name is missing
    }

    // Check if food exists
    const food = await Food.findById(foodId);
    if (!food) {
      return res.status(404).json({ success: false, message: 'Food not found' });
    }

    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
    }

    // Match by food + size
    const index = cart.items.findIndex(
      item =>
        item.food.toString() === foodId &&
        item.selectedVariant.size === selectedVariant.size
    );

    if (index > -1) {
      // Update quantity
      cart.items[index].quantity += quantity;
    } else {
      // Add new
      cart.items.push({
        food: foodId,
        selectedVariant,
        quantity,
      });
    }

    await cart.save();

    return res.status(200).json({ success: true, message: 'Cart updated', cart });
  } catch (error) {
    console.error('Add to Cart Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update cart' });
  }
};



/**
 * @desc Update item quantity
 * @route PUT /api/cart
 * @access Private
 */
export const updateCartItem = async (req, res) => {
  try {
    // Extract values from the request body
    const { foodId, size, quantity } = req.body;
    console.log(req.body);


    // Validate inputs
    if (!foodId || !size || typeof quantity !== 'number' || quantity < 0) {
      return res.status(400).json({ success: false, message: 'Invalid input' });
    }

    // Find the cart based on the user ID
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    // Find the item index that matches the foodId and size
    const index = cart.items.findIndex(
      item =>
        item.food.toString() === foodId &&
        item.selectedVariant.size === size
    );

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    // Update the quantity or remove the item if quantity is zero
    if (quantity === 0) {
      cart.items.splice(index, 1);
    } else {
      cart.items[index].quantity = quantity;
    }

    // Save the updated cart
    await cart.save();

    res.status(200).json({ success: true, message: 'Cart item updated', cart });
  } catch (error) {
    console.error('Update Cart Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update cart item' });
  }
};



/**
 * @desc Remove item from cart
 * @route DELETE /api/cart/item
 * @access Private
 */
// Remove item
export const removeCartItem = async (req, res) => {
  try {
    const { foodId, size } = req.query;  // Use req.query instead of req.body

    if (!foodId || !size) {
      return res.status(400).json({ success: false, message: "Missing foodId or size" });
    }

    const cart = await Cart.findOneAndUpdate(
      { user: req.user.id },
      {
        $pull: {
          items: {
            food: foodId,
            "selectedVariant.size": size,
          },
        },
      },
      { new: true }
    );

    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    res.json({ success: true, message: "Item removed from cart", cart });
  } catch (error) {
    console.error("Remove Item Error:", error);
    res.status(500).json({ success: false, message: "Failed to remove cart item" });
  }
};


/**
 * @desc Clear entire cart
 * @route DELETE /api/cart/clear
 * @access Private
 */
export const clearCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id });
    if (cart) {
      cart.items = [];
      await cart.save();
    }

    res.status(200).json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    console.error('Clear Cart Error:', error);
    res.status(500).json({ success: false, message: 'Failed to clear cart' });
  }
};
