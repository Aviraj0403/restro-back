import express from 'express';
import {
  registerViaGoogle,
  registerViaPhone,
  customRegister,
  signIn,
} from '../controllers/auth.controller.js'; 

const router = express.Router();

// Google Sign-In Route
router.post('/auth/register/google', registerViaGoogle);

// Phone Nuqmber Sign-In Route
router.post('/auth/register/google', registerViaPhone);

// Custom Registration (Username/Password) Route
router.post('/auth/customRegister', customRegister);

// Custom Sign-In (Username/Password) Route
router.post('/auth/signIn', signIn);

export default router;
