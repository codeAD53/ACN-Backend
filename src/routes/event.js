import express from "express";

import { createEvent, getEvents, getEventById, updateEvent, deleteEvent, rsvpEvent, cancelRsvp, getAttendees } from '../controllers/eventController.js';

import {  uploadEventBanner} from '../middlewares/uploadMiddleware.js';

import { createEventRules, validate } from "../middlewares/validateMiddleware.js";
import { protect,requireApproved,requireVerified } from "../middlewares/authMiddleware.js";


const router = express.Router();

router.use(protect);


// router.get('/',(req,res)=>{
//     res.json({success: true, message: "event route working"});
// });



// Browse events (public within API)
    router.get('/',getEvents);
    router.get('/:id',getEventById);
    router.get('/:id/attendees',getAttendees);


    // Create / update / delete — verified + approved only
    router.post('/',uploadEventBanner, requireApproved,requireVerified,createEventRules,validate,createEvent);
    router.put('/:id', requireVerified, updateEvent, uploadEventBanner);
    router.delete('/:id', requireVerified, deleteEvent);

    //RSVP
    router.post('/:id/rsvp',requireVerified,rsvpEvent);
    router.delete("/:id/rsvp",requireVerified,cancelRsvp);


export default router