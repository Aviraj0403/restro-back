import User from '../models/user.model.js';
import admin from '../firebase/firebase-admin.js';

import { generateToken } from '../utils/generateJWTToken.js';
import hashPassword from '../utils/hashPassword.js';

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

// Phone Registration
export const registerViaPhone = async (req, res) => {
  const { verificationId, otp } = req.body; // Send verificationId and OTP from frontend

  try {
    // Use Firebase Admin SDK to verify the OTP with the verificationId
    const credential = PhoneAuthProvider.credential(verificationId, otp);
    const userCredential = await admin.auth().signInWithCredential(credential);
    
    const { uid, phone_number, name } = userCredential.user;
    const user = await createOrUpdateUser(uid, { userName: name, phoneNumber: phone_number });
    await generateToken(res, { uid, userName: name, phoneNumber: phone_number });
    res.status(200).json({ message: 'User registered successfully', user });
  } catch (error) {
    console.error('Error during phone number registration:', error);
    res.status(400).json({ error: 'Phone Authentication failed' });
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
