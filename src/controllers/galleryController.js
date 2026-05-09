import GallerySchema from "../models/GallerySchema.js";
import { AppError } from "../middlewares/errorMiddleware.js";
import { deleteFromCloudinary } from "../middlewares/uploadMiddleware.js";

//POST /api/gallery
export const uploadImage = async (req,res,next) => {
    try {
        if(!req.file) return next(new AppError("Please upload an image",400));

        const {caption, eventTag, tags} = req.body;
        const image = await GallerySchema.create({
            uploadedBy: req.user._id,
            imageUrl: req.file.path,
            caption,
            eventTag: eventTag || null,
            tags: tags ? tags.split(",").map((t)=>t.trim()) : [],
            //isApproved defauts false - admin must approve
        });

        res.status(200).json({success: true, message: "Image Uplodaded. Awaiting admin approval.", 
            image,
        });
    } catch (error) {
        next(error);
    }
};

//GET /api/gallery

export const getGallery = async (req,res,next) => {
    try {
        const {eventTag, page =1 , limit=12} = req.query;
        const filter = {isApproved: true};
        if(eventTag) filter.eventTag = eventTag;
        
        const skip = (Number(page)-1) * Number(limit);

        
        const [images,total] = await Promise.all([
                GallerySchema.find(filter)
                            .populate("uploadedBy","name profilePicture")
                            .populate("eventTag", "title")
                            .skip(skip)
                            .limit(Number(limit))
                            .sort({createdAt: -1}),
                            GallerySchema.countDocuments(filter),
        ]);

        res.status(200).json({success: true, total, page: Number(page), pages: Math.ceil(total / Number(limit)), images})
    } catch (error) {
        next(error);
    }
};

// ─── DELETE /api/gallery/:id
export const deleteImage = async (req,res,next) => {
        try {
            const image = await GallerySchema.findById(req.params.id);

            if(!image) return next(new AppError("Image not found",404))
            
            if(image.uploadedBy.toString() !== req.user._id.toString() && req.user._id !== "admin"){
                return next(new AppError("Not authorised to delete this image",403));
            }
            await deleteFromCloudinary(image.imageUrl);
            await image.deleteOne();

            res.status(200).json({success: true, message: "Image Deleted Successfully"})
        } catch (error) {
            next(error);
        }
};

// ─── PATCH /api/gallery/:id/approve (admin)

export const approveImage = async (req,res,next) => {
        try {
            const image = await GallerySchema.findByIdAndUpdate(req.params.id,
                {isApproved: true},
                {new: true}
            );
            if(!image) return next(new AppError("Image not found",404));

            res.status(200).json({success: true,message: "Image Approved",image});
        } catch (error) {
            next(error);
        }
};

// ─── PATCH /api/gallery/:id/like
export const toggleLike = async (req,res,next) => {
    try {
        const image = await GallerySchema.findById(req.params.id);
        if (!image) return next(new AppError("Image not found", 404));
        const alreadyLiked = image.likes.includes(req.user._id);

        if(alreadyLiked) {
                image.likes.pull(req.user._id);
        }else{
            image.likes.push(req.user._id);
        }
        await image.save();

        res.status(200).json({
            success: true,
            message: alreadyLiked ? "Like Removed" : "Image Liked",
            likeCount: image.likes.length,
        })
    } catch (error) {
        next(error);
    }
}
// ─── GET /api/gallery/pending (admin)

export const getPendingImages = async (req,res,next) => {
    try {
        const images = await GallerySchema.find({isApproved: false}).populate("uploadedby", "name profilePicture").sort({createdAt: 1});

        res.status(200).json({success: true, total: images.length, images});
    } catch (error) {
        next(error);
        
    }
}