import express from 'express';
import {
    createFood,
    updateFood,
    deleteFood,
    getFood,
    getAllFood,
    getFoodByCategory,
    getTotalFood,
    updateFoodImages
} from '../controllers/food.controller.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import upload from '../middlewares/upload.js'; 

const router = express.Router();
router.post('/createFood', upload.array('foodImages', 10),verifyToken, createFood); 
// router.post('/createFood', createFood);
router.patch('/updateFood/:foodId', updateFood);
router.delete('/deleteFood/:id', deleteFood);

router.get('/getFood/:id', getFood);

router.get('/getAllFood', getAllFood);

router.get('/getFoodByCategory/category', getFoodByCategory);

router.get('/getTotalFood/total', getTotalFood);

router.patch('/updateFoodImages/:foodId/images', verifyToken, upload.array('foodImages'), updateFoodImages);

export default router;
