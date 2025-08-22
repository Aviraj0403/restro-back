import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema({
  name: { type: String, required: false, trim: true }, // optional
  code: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    trim: true
  },
  discountPercentage: { type: Number, min: 0, max: 100 }, // optional
  maxDiscountAmount: { type: Number, default: null },
  startDate: { type: Date },
  endDate: { type: Date },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  applyAutomatically: { type: Boolean, default: false },
  usageCount: { type: Number, default: 0 },
  maxUsageCount: { type: Number, default: 40 }
});

offerSchema.index({ code: 1 }, { unique: true, sparse: true });

// Create and export the model
const Offer = mongoose.model('Offer', offerSchema);

export default Offer;
