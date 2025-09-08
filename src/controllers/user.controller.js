import users from "../models/user.model.js";
import mongoose from "mongoose";
import { verifyToken } from '../middlewares/verifyToken.js'; 
export const addAddress = async (req, res) => {
  try {
    const user = await users.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const newAddress = {
      id: new mongoose.Types.ObjectId(),
      ...req.body,
    };

    // If user has no addresses, make this one default
    if (user.addresses.length === 0) {
      newAddress.isDefault = true;
    }

    user.addresses.push(newAddress);
    await user.save();

    res.status(201).json({ message: "Address added", addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ message: "Failed to add address", error: err.message });
  }
};
export const updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await users.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const addressIndex = user.addresses.findIndex((addr) => addr.id.toString() === id);
    if (addressIndex === -1) return res.status(404).json({ message: "Address not found" });

    user.addresses[addressIndex] = {
      ...user.addresses[addressIndex],
      ...req.body,
    };

    await user.save();
    res.status(200).json({ message: "Address updated", addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ message: "Failed to update address", error: err.message });
  }
};
export const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await users.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.addresses = user.addresses.filter((addr) => addr.id.toString() !== id);

    // If default was deleted, make first one default
    if (!user.addresses.some(addr => addr.isDefault) && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();
    res.status(200).json({ message: "Address deleted", addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete address", error: err.message });
  }
};
export const setDefaultAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await users.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    let found = false;
    user.addresses.forEach((addr) => {
      if (addr.id.toString() === id) {
        addr.isDefault = true;
        found = true;
      } else {
        addr.isDefault = false;
      }
    });

    if (!found) return res.status(404).json({ message: "Address not found" });

    await user.save();
    res.status(200).json({ message: "Default address set", addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ message: "Failed to set default", error: err.message });
  }
};
export const getUserAddresses = async (req, res) => {
  try {
    const user = await users.findById(req.user.id).select("addresses");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user.addresses);
  } catch (error) {
    console.error("Failed to get addresses:", error);
    res.status(500).json({ message: "Server error" });
  }
};
export const getTotalUsers = async (req, res) => {
  try {
    const total = await users.countDocuments();

    res.status(200).json({
      success: true,
      totalUsers: total,
    });
  } catch (error) {
    console.error("Error fetching total users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch total users.",
      error: error.message,
    });
  }
};









// Helper function to fetch users by role without pagination
export const getUsersByRoleHelper = async (roleType) => {
  return await users.find({ roleType }).select('-password');
};

// Fetch all customers
export const getAllCustomers = async (req, res) => {
  try {
    const users = await getUsersByRoleHelper('customer');
    return res.status(200).json({
      success: true,
      message: 'Customers fetched successfully',
      data: users,
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch customers',
    });
  }
};

// Fetch all admins
export const getAllAdmins = async (req, res) => {
  try {
    const users = await getUsersByRoleHelper('admin');
    return res.status(200).json({
      success: true,
      message: 'Admins fetched successfully',
      data: users,
    });
  } catch (error) {
    console.error('Error fetching admins:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch admins',
    });
  }
};

// Fetch all delivery boys
export const getAllDeliveryBoys = async (req, res) => {
  try {
    const users = await getUsersByRoleHelper('deliveryBoy');
    return res.status(200).json({
      success: true,
      message: 'Delivery boys fetched successfully',
      data: users,
    });
  } catch (error) {
    console.error('Error fetching delivery boys:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery boys',
    });
  }
};

// Fetch all regular users
export const getAllUsers = async (req, res) => {
  try {
    const users = await getUsersByRoleHelper('user');
    return res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      data: users,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
    });
  }
};

export const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select("-password"); // Select all except the password
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};







