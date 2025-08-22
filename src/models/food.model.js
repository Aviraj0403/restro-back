import mongoose from 'mongoose';

const foodSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: [3, 'Food name must be at least 3 characters long'], 
  },
  description: {
    type: String,
    required: true,
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
  imageUrls: {
    type: [String],
    required: true,
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
    price: { type: Number, required: true },
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
    required: true,
  },
  discount: {
    type: Number,
    default: 0,  
  },
}, {
  timestamps: true,
});

function arrayLimit(val) {
  return val.length <= 10;  // Limiting the number of ingredients
}
foodSchema.index({ name: 1, category: 1, status: 1 });
foodSchema.index({ isHotProduct: 1 });
foodSchema.index({ isBudgetBite: 1 });
foodSchema.index({ isFeatured: 1 });
foodSchema.index({ isRecommended: 1 });
foodSchema.index({ ingredients: 'text' });

// foodSchema.virtual('priceAfterDiscount').get(function () {
//   return this.finalPrice || this.price;
// });

foodSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret._id; 
    delete ret.__v;  
  },
});

// Model
const Food = mongoose.model('Food', foodSchema);

export default Food;
