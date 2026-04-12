import mongoose from "mongoose";

const connectionSchema = new mongoose.Schema({
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
        connectionType: String,
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
connectionSchema.index(
    {requesterId: 1, targetId: 1, type: 1},
    {unique: true}
);

export default mongoose.model("Connection",connectionSchema);