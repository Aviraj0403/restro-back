import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true, 
        trim: true, 
        unique: true 
    },
    description: { 
        type: String, 
        required: true, 
        trim: true 
    },
    displayOrder: { 
        type: Number, 
        default: 0 
    },
    isFeatured: { 
        type: Boolean, 
        default: false 
    },
    image: {
        type: [String],
        required: true,
        validate: {
            validator: function (v) {
                return Array.isArray(v) && v.length > 0; 
            },
            message: 'Category must have at least one image.'
        }
    },
    isRecommended: { 
        type: Boolean, 
        default: false 
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    isDeleted: { 
        type: Boolean, 
        default: false 
    },
    publicId: { 
        type: String, 
        default: null 
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
}, { timestamps: true });

// Index for quick lookups
categorySchema.index({ name: 1 }, { unique: true });
categorySchema.index({ isActive: 1, isFeatured: 1 });  // Optimized queries for active and featured

const Category = mongoose.model('Category', categorySchema);

export default Category;
