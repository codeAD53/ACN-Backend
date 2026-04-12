import express from "express";
import { getNotifications, markAllAsRead, markAsRead, deleteNotification, clearAllNotifications } from './controllers/notificationController.js';

import { protect } from "../middlewares/authMiddleware.js";
const router = express.Router();

router.use(protect);

// router.get('/',(req,res)=>{
//     res.json({success: true, message: "notification route working"});
// });

 //Notifications
    router.get('/',getNotifications);
    router.patch('/read-all',markAllAsRead);
    router.delete('/',clearAllNotifications);
    router.patch('/:id/read',markAsRead);
    router.delete('/:id',deleteNotification);



export default router