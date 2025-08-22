import User from '../models/user.model.js';
import admin from '../firebase/firebase-admin.js';
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { generateToken } from '../utils/generateJWTToken.js';
import hashPassword from '../utils/hashPassword.js';
import generateOTP from '../utils/generateOTP.js';
import sendMailer from '../utils/emailService.js';
import cloudinary from '../config/cloudinaryConfig.js';

import crypto from 'crypto';
import dotenv from 'dotenv';
const createOrUpdateUser = async (firebaseUid, userData) => {
  let user = await User.findOne({ firebaseUid });
  if (!user) {
    userData.roleType = 'customer'; // Default to customer
    user = new User({ firebaseUid, ...userData });
    await user.save();
  } else {
    user.userName = userData.userName || user.userName;
    user.firstName = userData.firstName || user.firstName;
    user.lastName = userData.lastName || user.lastName;
    user.email = userData.email || user.email;
    user.phoneNumber = userData.phoneNumber || user.phoneNumber;
    await user.save();
  }
  return user;
};

// Google Registration
export const registerViaGoogle = async (req, res) => {
  const { idToken } = req.body;
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name } = decodedToken;
    const user = await createOrUpdateUser(uid, { userName: name, email });
    await generateToken(res, { uid, userName: name, email });
    res.status(200).json({ message: 'User registered successfully', user });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(400).json({ error: 'Authentication failed' });
  }
};

//make it hold
export const registerViaPhone = async (req, res) => {
  const { verificationId, otp } = req.body;

  // Validate input fields
  if (!verificationId || !otp) {
    return res.status(400).json({ error: 'Verification ID and OTP are required' });
  }

  // Validate OTP format (e.g., should be a 6-digit number)
  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({ error: 'Invalid OTP format. It must be a 6-digit number.' });
  }

  try {
    // Create Firebase Phone Auth credential
    const credential = PhoneAuthProvider.credential(verificationId, otp);

    // Sign in with Firebase using the credential (OTP)
    const userCredential = await signInWithCredential(admin.auth(), credential);

    // Check if the user exists in your database (using Firebase UID)
    let user = await User.findOne({ firebaseUid: userCredential.user.uid });

    if (!user) {
      // If user doesn't exist, create or update their information
      const { uid, phoneNumber, displayName } = userCredential.user;
      const newUser = await createOrUpdateUser(uid, {
        userName: displayName || 'User_' + uid, 
        phoneNumber
      });
      
      // Generate JWT token for the new user
      const token = await generateToken(res, { uid, userName: newUser.userName, phoneNumber: newUser.phoneNumber });
      
      // Respond with the new user and token
      return res.status(201).json({
        message: 'User registered successfully',
        user: newUser,
        token
      });
    }

    // If user exists, update their information
    const { uid, phoneNumber, displayName } = userCredential.user;
    user.userName = displayName || user.userName;
    user.phoneNumber = phoneNumber || user.phoneNumber;

    // Update the user in the database
    await user.save();

    // Generate JWT token
    const token = await generateToken(res, { uid, userName: user.userName, phoneNumber: user.phoneNumber });

    // Respond with the user and token
    res.status(200).json({
      message: 'User logged in successfully',
      user,
      token
    });

  } catch (error) {
    // Check for Firebase Auth specific error (like incorrect OTP)
    if (error.code === 'auth/invalid-verification-code') {
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }
    
    console.error('Error during phone number registration:', error);
    
    // Generic error message for other issues
    res.status(400).json({ error: 'Phone Authentication failed. Please check your OTP or try again later.' });
  }
};
// Custom Registration (Email/Password)
export const customRegister = async (req, res) => {
  const { userName, firstName, lastName, email, password, phoneNumber } = req.body;
  try {
    const existingUser = await User.findOne({ $or: [{ email }, { phoneNumber }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    const hashedPassword = password ? hashPassword(password) : undefined;
    const newUser = new User({
      userName,
      firstName,
      lastName,
      email,
      phoneNumber,
      password: hashedPassword,
      roleType: 'customer',
    });
    await newUser.save();
    await generateToken(res, { uid: newUser._id, userName, email, phoneNumber });
    res.status(201).json({ message: 'User registered successfully', user: newUser });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
export const authMe = async (req, res) => {
  try {
    const userData = req.user;  // Assuming you've added middleware to populate `req.user`
    if (!userData) return res.status(401).json({ message: "Auth failed, login again" });
    res.status(200).json({ data: userData });
  } catch (error) {
    res.status(401).json({ message: "Failed to authenticate" });
  }
};

// Sign-In (Username/Password or Firebase)
export const signIn = async (req, res) => {
  const { idToken, userName, password } = req.body;
  try {
    if (idToken) {
      // Sign in via Firebase (Google or Phone)
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const { uid } = decodedToken;
      let user = await User.findOne({ firebaseUid: uid });
      if (!user) {
        return res.status(400).json({ error: 'User not found in the database' });
      }
      await generateToken(res, { uid, userName: user.userName, email: user.email });
      res.status(200).json({ message: 'Sign-in successful', user });
    } else if (userName && password) {
      // Sign in via Username/Password
      const user = await User.findOne({ userName });
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }
      await generateToken(res, { uid: user._id, userName: user.userName, email: user.email });
      res.status(200).json({ message: 'Sign-in successful', user });
    } else {
      res.status(400).json({ error: 'Invalid sign-in method' });
    }
  } catch (error) {
    console.error('Error signing in:', error);
    res.status(400).json({ error: 'Authentication failed' });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000); // ✅ numeric OTP
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // ✅ 10 minutes expiry

    user.resetOTP = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send OTP via email
    await sendMailer(email, "Password Reset OTP", "otp", {
      customerName: user.userName,
      otp,
    });

    res.status(200).json({ message: "OTP sent to your email" });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;  // Assuming you're using a middleware to verify user
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Compare the current password
    const isMatch = await comparePassword(user.password, currentPassword);

    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Update the password with the new one
    user.password = hashPassword(newPassword);
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to change password", error: err.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.resetOTP !== Number(otp) || user.otpExpiry < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.password = hashPassword(newPassword); // Hash the new password
    user.resetOTP = null; // Reset OTP and expiry after successful password change
    user.otpExpiry = null;
    await user.save();

    await sendMailer(email, "Password Reset Confirmation", "resetPassword", {
      customerName: user.userName,
    });

    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: "Failed to reset password", error: err.message });
  }
};


export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.resetOTP !== Number(otp) || user.otpExpiry < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Optionally, you can clear OTP fields if required:
    // user.resetOTP = null;
    // user.otpExpiry = null;
    // await user.save();

    return res.status(200).json({
      message: "OTP verified",
      success: true,
      email: user.email,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to verify OTP",
      error: err.message,
    });
  }
};

export const profile = async (req, res) => {
  try {
    const userProfileDetail = await User.findById(req.user.id).select("-password");
    if (!userProfileDetail) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ userProfileDetail });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const logout = async (req, res) => {
  try {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Enforce secure cookies in production
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      path: "/",
    };

    res.clearCookie("accessToken", cookieOptions);  // Clear the access token cookie
    res.clearCookie("refreshToken", cookieOptions);  // Clear the refresh token cookie

    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
};


export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, address } = req.body;

    // Prevent updates to protected fields
    const forbiddenFields = ['email', 'password', 'roleType', '_id'];
    for (let key of forbiddenFields) {
      if (req.body[key]) {
        return res.status(400).json({ message: `You cannot update field: ${key}` });
      }
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;

    // Handle avatar (file upload)
    if (req.file?.path) {
      user.avatar = req.file.path;
    } else if (req.body.avatar) {
      user.avatar = req.body.avatar;  // Optional: validate avatar URL here
    }

    // Handle address update
    if (address) {
      const allowedAddressFields = ['street', 'city', 'state', 'zip', 'country'];
      const isInvalidField = Object.keys(address).some(field => !allowedAddressFields.includes(field));
      if (isInvalidField) {
        return res.status(400).json({ message: "Invalid address fields submitted" });
      }

      user.address = {
        ...user.address,
        ...address,
      };
    }

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      userProfile: {
        id: user._id,
        userName: user.userName,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        address: user.address,
        avatar: user.avatar,
      }
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({
      message: "Something went wrong while updating the profile",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};


export const uploadAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Upload file to Cloudinary (you'll need the cloudinary config in place)
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "avatars",
      width: 300,
      crop: "scale"
    });

    // Save Cloudinary URL in DB
    user.avatar = result.secure_url;
    await user.save();

    // Optionally delete the temp file
    fs.unlinkSync(req.file.path);

    res.status(200).json({
      message: "Avatar uploaded successfully",
      avatarUrl: result.secure_url,
    });
  } catch (error) {
    console.error("Upload Avatar Error:", error);
    res.status(500).json({ message: "Failed to upload avatar" });
  }
};


export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: "No refresh token" });

    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    const userData = decoded.data;

    const accessToken = jwt.sign(
      { data: userData },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV !== "development",
      maxAge: 60 * 60 * 1000,
    });

    return res.status(200).json({ message: "Access token refreshed" });
  } catch (error) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
};