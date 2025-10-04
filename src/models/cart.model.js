import mongoose from 'mongoose';

// Cart Item Schema
const cartItemSchema = new mongoose.Schema(
  {
    food: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Food',
      required: true,
    },
    selectedVariant: {
      name: { type: String, required: true },
      price: { type: Number, required: true },
      description: { type: String },
      size: {
        type: String,
        enum: ['Small', 'Medium', 'Large'],
        required: true,
      },
      priceAfterDiscount: { type: Number }, // populated from Food virtual
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
  },
  { _id: false }
);

// Cart Schema
const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      // unique: true, // one cart per user
    },
    items: [cartItemSchema],
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexing for performance
cartSchema.index({ user: 1 });
cartSchema.index({ updatedAt: -1 });
cartSchema.index({ 'items.product': 1 });

// Virtual for calculating the total price
cartSchema.virtual('totalPrice').get(function () {
  return this.items.reduce((total, item) => {
    const price =
      item.selectedVariant.priceAfterDiscount ??
      item.selectedVariant.price;
    return total + price * item.quantity;
  }, 0);
});

// Auto-update updatedAt when cart changes
cartSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Clean JSON response
cartSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    delete ret.__v;
    return ret;
  },
});

// Model
const Cart = mongoose.model('Cart', cartSchema);

export default Cart;
