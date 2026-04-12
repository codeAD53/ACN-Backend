import express from "express";
import { getGallery, approveImage, deleteImage, uploadImage, toggleLike, getPendingImages } from './controllers/galleryController.js';

import { protect, restrictTo, requireVerified } from "../middlewares/authMiddleware.js";

import { uploadGalleryImage } from "../middlewares/uploadMiddleware.js";
const router = express.Router();

router.use(protect);

// router.get('/',(req,res)=>{
//     res.json({success: true, message: "gallery route working"});
// });

  //gallery
    router.get('/',getGallery);
    router.get('/pending',restrictTo("admin"),getPendingImages);
    router.post('/',requireVerified,uploadImage,uploadGalleryImage);
    router.patch('/:id/approve',restrictTo("admin"),approveImage);
    router.patch('/:id/like',restrictTo("admin"),toggleLike,requireVerified);
    router.delete('/:id',deleteImage,requireVerified);


export default router