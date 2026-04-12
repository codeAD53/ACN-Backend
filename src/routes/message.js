import express from "express";
import {sendMessage, getMessages, deleteMessage} from '../controllers/chatController.js'

import { protect,requireVerified } from "../middlewares/authMiddleware.js";
const router = express.Router();
router.use(protect,requireVerified);

// router.get('/',(req,res)=>{
//     res.json({success: true, message: "message route working"});
// });

//Messages
    router.post('/',sendMessage);
    router.get('/:chatId',getMessages);
    router.delete('/:id',deleteMessage);

export default router