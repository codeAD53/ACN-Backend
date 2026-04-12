import NotificationSchema from "../models/NotificationSchema";
import { AppError } from "../middlewares/errorMiddleware";

// ─── GET /api/notifications

export const getNotifications = async (req,res,next) => {
    try {
        const {page = 1, limit = 20} = req.query;
        const skip = (NUmber(page) - 1) * Number(limit);

        const [notifications, total, unreadCount] = await Promise.all([
            NotificationSchema.find({userId: req.user._id}.skip(skip).limit(Number(limit).sort({createdAt: -1})),
            NotificationSchema.countDocuments({userId: req.user._id}),
        NotificationSchema.countDocuments({userid: req.user._id, isRead: false})),
       ]);

       res.status(200).json({
      success: true,
      total,
      unreadCount,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      notifications,
    });
    } catch (error) {
        next(error);
    }
};

// ─── PATCH /api/notifications/:id/read

export const markAsRead = async (req,res,next) => {
    try {
        const notification = await NotificationSchema.findByIdAndUpdate({_id: req.params.id, userId: req.user._id},
            {isRead: true},
            {new: true}
        );

        if(!notification) return next(new AppError("Notification not found", 404));

        res.status(200).json({ success: true, notification });
    } catch (error) {
        next(error);
    }
};

// ─── PATCH /api/notifications/read-all
export const markAllAsRead = async (req,res,next) => {
    try {
        await NotificationSchema.updateMany({
            userId: req.user._Id, isRead: false 
        }, {isRead: true});

        res.status(200).json({ success: true, message: "All notifications marked as read"});
    } catch (error) {
        next(error);
    }
};

// ─── DELETE /api/notifications/:id

export const deleteNotification = async (req,res,next) => {
    try {
        const notification = await NotificationSchema.findByIdAndDelete({_id: req.params._id, userId: req.user._id});

        if(!notification) return next(new AppError("Notification not found", 404));

        res.status(200).json({success: true, message: "Notification Deleted"});
    } catch (error) {
        next(error);
    }
};

// ─── DELETE /api/notifications
export const clearAllNotifications = async (req,res,next) => {
    try {
        await NotificationSchema.deleteMany({userId: req.user._id});
        res.status(200).json({success: true, message: "All notifications cleared"});
    } catch (error) {
        next(error);
    }
};

// ─── Helper: createNotification 
// Call this from other controllers to trigger notifications

export const createNotification = async ({userId, type, message, refId, refModel}) => {
    try {
        await NotificationSchema.create({userId,type,message,refId,refModel});
    } catch (error) {
        console.error("Failed to create notification: ",error.message);
        // Never throw — notification failure should never break main flow
    }
}