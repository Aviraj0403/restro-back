import User from '../models/userModel'; // Assuming User model is here
import bcrypt from 'bcryptjs';

// Add a new address
export const addAddress = async (req, res) => {
  const { userId, address } = req.body;

  try {
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if the address already exists
    const existingAddress = user.addresses.find(
      (existing) => existing.phoneNumber === address.phoneNumber && existing.street === address.street
    );

    if (existingAddress) {
      return res.status(400).json({ error: 'Address already exists' });
    }

    // Add the new address
    user.addresses.push(address);
    await user.save();

    res.status(200).json({ message: 'Address added successfully', user });
  } catch (error) {
    console.error('Error adding address:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Set Default Address
export const setDefaultAddress = async (req, res) => {
  const { userId, addressId } = req.body;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update default address
    user.addresses.forEach((address) => {
      address.isDefault = address._id.toString() === addressId;
    });

    await user.save();

    res.status(200).json({ message: 'Default address updated successfully', user });
  } catch (error) {
    console.error('Error setting default address:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
