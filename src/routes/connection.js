import express from "express";

import { sendConnectionRequest, getMyConnections, getIncomingRequests, acceptConnection, rejectConnection, withdrawConnection } from '../controllers/connectionController.js';
import { protect, requireApproved,requireVerified } from "../middlewares/authMiddleware.js";

import { connectionRequestRules,validate } from "../middlewares/validateMiddleware.js";
const router = express.Router();

router.use(protect, requireApproved, requireVerified);

// router.get('/',(req,res)=>{
//     res.json({success: true, message: "connection route working"});
// });

//Connections
    router.get('/',getMyConnections);
    router.get('/requests',getIncomingRequests);
    router.post('/',connectionRequestRules,validate,sendConnectionRequest);
    router.patch("/:id/accept",acceptConnection);
    router.patch("/:id/reject",rejectConnection);
    router.delete('/:id',withdrawConnection);

export default router