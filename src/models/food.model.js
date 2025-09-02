import mongoose from 'mongoose';

function arrayLimit(val) {
  return val.length <= 10;
}

const foodSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Food name is required'],
    trim: true,
    minlength: [3, 'Food name must be at least 3 characters long'],
    unique: true,  // Ensure food names are unique
    index: true,    // Create an index for fast searches
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    minlength: [10, 'Description must be at least 10 characters long'],
  },
  ingredients: {
    type: [String],
    default: [],
    validate: [arrayLimit, 'Ingredients array exceeds the limit of 10'],
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true,
  },
  foodImages: {
    type: [String],
    required: [true, 'Food must have at least one image'],
    validate: {
      validator: function (v) {
        return Array.isArray(v) && v.length > 0;
      },
      message: 'Food must have at least one image.',
    },
  },

  isHotProduct: {
    type: Boolean,
    default: false,
  },
  isBudgetBite: {
    type: Boolean,
    default: false,
  },
  isSpecialOffer: {
    type: Boolean,
    default: false,
  },
  variants: [{
    name: { type: String, required: true },
    price: { type: Number, required: true, min: [0, 'Price must be positive'] },
    description: { type: String },
    size: { type: String, enum: ['Small', 'Medium', 'Large'], required: true },
  }],
  isFeatured: {
    type: Boolean,
    default: false,
  },
  isRecommended: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
  },
  cookTime: {
    type: String,
    required: false,
  },
  itemType: {
    type: String,
    enum: ['Veg', 'Non-Veg'],
    required: false,
  },
  variety: {
    type: String,
    enum: ['Breakfast', 'Lunch', 'Dinner'],
    required: false,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount must be at least 0'],
    max: [100, 'Discount cannot exceed 100'],
  },
}, {
  timestamps: true,
});

foodSchema.virtual('priceAfterDiscount').get(function () {
  return this.discount > 0 ? this.variants.map(variant => {
    variant.priceAfterDiscount = variant.price - (variant.price * (this.discount / 100));
    return variant;
  }) : this.variants;
});


foodSchema.pre('save', function (next) {
  if (this.discount < 0 || this.discount > 100) {
    return next(new Error('Discount must be between 0 and 100'));
  }
  next();
});

// Indexes for faster queries
foodSchema.index({ name: 1, category: 1, status: 1 });
foodSchema.index({ isHotProduct: 1 });
foodSchema.index({ isBudgetBite: 1 });
foodSchema.index({ isFeatured: 1 });
foodSchema.index({ isRecommended: 1 });
foodSchema.index({ ingredients: 'text' });

// JSON transformation
foodSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret._id;
    delete ret.__v;
    ret.priceAfterDiscount = ret.priceAfterDiscount || ret.variants.map(v => v.price);
  },
});

// Model
const Food = mongoose.model('Food', foodSchema);

export default Food;
