import mongoose from "mongoose";

const GallerySchema = new mongoose.Schema({
    uploadedBy:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    imageUrl: {
        type: String,
        required: true
    },
    caption: {
        type: String,
        maxLength: 300,
    },
    eventTag: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
        default: null,
    },
    tags: [String],
    isApproved: {
        type: Boolean,
        default: false,
    },
    likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    ],
}, {timestamps: true});

GallerySchema.virtual("likeCount").get(function () {
  return this.likes.length;
});
 
GallerySchema.index({ uploadedBy: 1 });
GallerySchema.index({ eventTag: 1 });
GallerySchema.index({ isApproved: 1 });

export default mongoose.model("Gallery", GallerySchema)