import express from 'express';
import {
  registerViaGoogle,
  registerViaPhone,
  customRegister,
  signIn,
  logout,
  forgotPassword,
  resetPassword,
  profile,
  updateProfile,
  uploadAvatar,
  authMe,
  refreshToken,
  verifyOtp,
} from '../controllers/auth.controller.js'; 
import { verifyToken } from '../middlewares/verifyToken.js'; 
import  upload  from '../middlewares/upload.js';
const router = express.Router();

router.post('/register/google', registerViaGoogle);
//hold on
router.post('/register/phone', registerViaPhone);

router.post('/customRegister', customRegister);

router.post('/signIn', signIn);

router.post('/user/forgotPassword', forgotPassword);
router.post('/user/resetPassword', resetPassword);
router.post('/user/verifyOtp', verifyOtp);

router.post('/user/logout', verifyToken, logout);
router.get('/user/profile', verifyToken,profile);
router.patch('/user/updateProfile', verifyToken, updateProfile);
router.post('/user/uploadAvatar', verifyToken, upload.single('avatar'), uploadAvatar);

router.get('/me', verifyToken, authMe);
router.post('/auth/refresh-token', refreshToken);

export default router;
