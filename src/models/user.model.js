import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: false,
      unique: true,
    },
    userName: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true, // allows phone number to be optional if logging in via Firebase
    },
    email: {
      type: String,
      required: true,
      unique: true,
      sparse: true, // allows email to be optional if logging in via Firebase
    },
    password: {
      type: String, // Store the hashed password here
      required: false, // Make sure it's required for custom auth
      select: false,  // Don't include it in queries by default
    },
    roleType: {
      type: String,
      enum: ['customer', 'admin', 'deliveryBoy'],
      default: 'customer',
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    avatar: {
      type: String,
      default: '',
      trim: true,
    },
    addresses: [
      {
        _id: false,
        label: { type: String, trim: true, default: 'Home' },
        phoneNumber: { type: String, trim: true },
        street: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        postalCode: { type: String, trim: true },
        country: { type: String, trim: true, default: 'India' },
        isDefault: { type: Boolean, default: false },
      },
    ],
    resetOTP: { type: Number },
    otpExpiry: { type: Date },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

export default User;
