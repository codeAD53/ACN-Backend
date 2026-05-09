import mongoose from "mongoose";

const ConnectionSchema = new mongoose.Schema({
    requesterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    type: {
        type: String,
        enum: ["mentorship", "referral"],
        required: true,
    },
    message: {
        type: String,
        maxLength: 1000,
    },
    status: {
        type: String,
        enum: ["pending","accepted","rejected"],
        default: "pending",
    }
},
{ timestamps :true}
);

//Prevent duplicate requests
ConnectionSchema.index(
    {requesterId: 1, targetId: 1, type: 1},
    {unique: true}
);

ConnectionSchema.index({ targetId: 1, status: 1});
ConnectionSchema.index({requesterId: 1, status: 1});

export default mongoose.model("Connection",ConnectionSchema);