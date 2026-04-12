import express from "express";
import { getOrCreateChats, createGroupChat, getMyChats,  } from './controllers/chatController.js';

import { protect, requireVerified } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect,requireVerified);

// router.get('/',(req,res)=>{
//     res.json({success: true, message: "chat route working"});
// });

//Chats 
    router.get('/',getMyChats);
    router.post('/',getOrCreateChats);
    router.post('/group',createGroupChat);

export default router