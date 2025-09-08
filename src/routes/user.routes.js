import express from "express";
import {
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    getUserAddresses,
    getTotalUsers,
    getAllCustomers,
  getAllAdmins,
  getAllDeliveryBoys,
  getAllUsers,
  getUserDetails,

       } 
from "../controllers/user.controller.js";
import { verifyToken } from '../middlewares/verifyToken.js';

const router = express.Router();


router.post('/user/address', verifyToken, addAddress);
router.patch('/user/address/:id', verifyToken, updateAddress);
router.delete('/user/address/:id', verifyToken, deleteAddress);
router.get('/user/getaddresses', verifyToken, getUserAddresses);
router.get('/user/gettotalusers', verifyToken, getTotalUsers);


router.patch('/user/address/:id/set-default', verifyToken, setDefaultAddress);



// router.get('/role/:role', verifyToken, getUsersByRole);

// Fetch user details by userId
router.get('/customers', getAllCustomers);

// Route to get all admins
router.get('/admins', getAllAdmins);

// Route to get all delivery boys
router.get('/deliveryBoys', getAllDeliveryBoys);

// Route to get all regular users
router.get('/regular', getAllUsers);
router.get('/user/:userId', verifyToken,getUserDetails);

export default router;
