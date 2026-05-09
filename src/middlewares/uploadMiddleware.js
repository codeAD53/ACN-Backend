import multer from "multer"
import { v2 as cloudinary } from "cloudinary"
import { CloudinaryStorage } from "multer-storage-cloudinary"
import { AppError } from "./errorMiddleware.js"

//cloudinary configuration

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED_IMAGE_TYPES = ["image/jpeg","image/jpg","image/png","image/webp"];

const imageFileFilter = (req,res,cb) => {
    if(ALLOWED_IMAGE_TYPES.includes(file.mimetype)){
        cb(null, true);
    }else{
        cb(new AppError("Only JPEG, PNG, and Webp images are allowed", 400),false);
    }
};

const profileStorage = new CloudinaryStorage({
        cloudinary,
        params: {
            folder: "alumni-connect/profiles",
            allowed_formats: ["jpeg","jpg","png","webp"],
            transformation: [
                {width: 400, height: 400, crop: "fill", gravity: "face"},
                {quality: 'auto', fetch_format: "auto"},
            ],
        },
});

const galleryStorage = new CloudinaryStorage({
    cloudinary,
    params:{
        folder: "alumni-connect/gallery",
        allowed_formats: ["jpeg","jpg","png","webp"],
        transformation: [
            {width: 1200, crop: "limit"},
            {quality: "auto", fetch_format: "auto"},
        ],
    },
});

const eventBannerStorage = new CloudinaryStorage({
    cloudinary,
    params:{
        folder: "alumni-connect/events",
        allowed_formats: ["jpeg","jpg","png","webp"],
        transformation: [
            {width: 1200, crop: "fill", height: 630},
            {quality: "auto", fetch_format: "auto"},
        ],
    },
});

export const uploadProfilePicture = multer({
    storage: profileStorage,
    fileFilter: imageFileFilter,
    limits: {fileSize: 5 * 1024 * 1024} //5MB
}).single("profilePicture"); //field name must match form field

export const uploadGalleryImage = multer({
    storage: galleryStorage,
    fileFilter: imageFileFilter,
    limits: {fileSize: 5*1024*1024},
}).single("image");

export const uploadEventBanner = multer({
    storage: eventBannerStorage,
    fileFilter: imageFileFilter,
    limits: {fileSize:  5 * 1024 * 1024}
}).single("bannerImage");

export const deleteFromCloudinary = async (imageUrl) => {
    if(!imageUrl) return;
        // Extract public_id from the Cloudinary URL
  // URL format: https://res.cloudinary.com/{cloud}/image/upload/v123/{folder}/{public_id}.ext

    const parts = imageUrl.split("/");
    const fileName = parts[parts.length - 1].split(".")[0];
    const folder = parts[parts.length -2];
    const publicId = `${folder}/${fileName}`;

    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error("Failed to delete image from Cloudinary:",error.message)
    }
    
};

export const handleUpload = (uploadFn) => (req,res) => {
    return new Promise((resolve, reject)=>{
        uploadFn(req,res,(err)=>{
            if(err) reject(err);
            else resolve();
        });
    });
};
