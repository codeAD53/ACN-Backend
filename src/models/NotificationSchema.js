import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    type: {
        type: String,
        enum: [
            "connection_request",
            "connection_accepted",
            "job_post",
            "event_created",
            "account_approved",
            "message",
            "rsvp_confirmed",
        ],
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    refId: {
        type: mongoose.Schema.Types.ObjectId,
      default: null, // ID of related document (job, event, connection, etc.)
    },
    refModel: {
        type: String,
        enum: ['Job','Event','Connection','Chat','User',null],
        default: null,
    },
    isRead: {
        type: Boolean,
        default: false,
    },
}, {timestamps: true});

NotificationSchema.index({ userId: 1, isRead: 1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });
 
export default mongoose.model("Notification", NotificationSchema);