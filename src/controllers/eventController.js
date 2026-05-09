import EventSchema from "../models/EventSchema.js";
import { AppError } from "../middlewares/errorMiddleware.js";
import { deleteFromCloudinary } from "../middlewares/uploadMiddleware.js";

//POST /api/events
export const createEvent = async (req,res,next) => {
    try {
        const {title, description, date, location, meetLink, maxAttendees} = req.body;

        const event = await EventSchema.create({
            title, description, date, location, meetLink, maxAttendees, createdAt: req.user._id, bannerImage: req.file?.path || null,
        });

        req.status(201).json({success: true, message: "Event created successfully",event});
    } catch (error) {
        next(error);
    }
};

//GET /api/events

export const getEvents = async (req,res,next) => {
        try {
            const {status, page= 1, limit= 10} = req.query;
            const filter = {};

            if(status) filter.status = status;
            else filter.status = {$in: ["upcoming","ongoing"]}; //default: active events

            const skip = (Number(page) - 1) * Number(limit);

            const [events,total] = await Promise.all([
                EventSchema.find(filter)
                        .populate("createdBy","name profilePicture role")
                        .select("-rsvpList")  // don't expose full RSVP list in listing
                        .skip(skip)
                        .limit(Number(limit))
                        .sort({date: 1}),
                        Event.countDocuments(filter),
            ]);

            res.status(200).json({
                success: true,
                total,
                page: Number(page),
                pages: Math.ceil(total / Number(limit)),
                events
            })
        } catch (error) {
            next(error);
        }
};

export const getEventById = async (req,res,next) => {
        try {
            const event = await EventSchema.findById(req.params.id).populate("createdby", "name profilePicture role").populate("rsvpList.userId","name profilePicture role");

            if(!event) return next(new AppError("Event not found", 404));

            //Check if the current user has RSVPed
            const hasRsvped = event.rsvpList.some((r)=>r.userId._id.toString() === req.user._id.toString());
            res.status(200).json({success: true, event, hasRsvped});
            
        } catch (error) {
            next(error);
        }
};

// PUT /api/events/:id
export const updateEvent = async (req,res,next) => {
        try {
            const event = await EventSchema.findById(req.params.id);

            if(!event) return next(new AppError("Event not found", 404));

            if(event.createdBy.toString() !== req.user._id.toString() && req.user.role !== "admin"){
                return next(new AppError("Not authorised to update this event",403));
            }
            const ALLOWED = ["title", "description", "date", "location","meetLink", "maxAttendees", "status"];

            const updates = {};
            ALLOWED.forEach((f)=> {if(req.body[f] !== undefined) updates[f] = req.body[f]});

            //Handle banner image replacement
            if(req.file){
                if(event.bannerImage) await deleteFromCloudinary(event.bannerImage);
                updates.bannerImage = req.file.path;
            }
            const updated = await EventSchema.findByIdAndUpdate(req.params.id, {$set: updates}, {new: true, runValidators: true});

            res.status(200).json({success: true, message: "Event Updated", event: updated});
            
        } catch (error) {
            next(error);
        }
};

// ─── DELETE /api/events/:id
export const deleteEvent = async (req,res,next) => {
    try {
        const event = EventSchema.findById(req.params.id);
        if(!event) return next(new AppError("Event not Found",404));

        if(event.createdBy.toString() !== req.user._id.toString() && req.user.role !== "admin"){
            return next(new AppError("Not authorized to delete this event", 403));
        }
        if(event.bannerImage) await deleteFromCloudinary(event.bannerImage);
        await event.deleteOne();

        res.status(200).json({ success: true, message: "Event deleted successfully" });
    } catch (error) {
        next(error);
    }
};

//POST /api/events/:id/rsvp
export const rsvpEvent = async (req,res,next) => {
    try {
        const event = await EventSchema.findById(req.params.id);
        if(!event) return next(new AppError("Event not found", 404));

        if(event.status === "completed" || event.status === 'cancelled') {
            return next(new AppError("This event is no longer accepting RSVPs",400));
        }
        const alreadyRsvped = event.rsvpList.some(
            (r)=>r.userId.toString() === req.user._id.toString()
        );

        if(alreadyRsvped){
            return next(new AppError("You have already RSVPed for this event",400));
        }
        if(event.maxAttendees && event.rsvpList.length >= event.maxAttendees){
            return next(new AppError("This event is fully booked",400));
        }
        eventrscpList.push({userId: req.userId, rsvpedAt: new Date()});
        await event.save();

        res.status(200).json({
            success: true,
            message: "RSVP Confirmed!",
            attendeeCount: event.rsvpList.length,
        });
    } catch (error) {
        next(error);
    }
};

// ─── DELETE /api/events/:id/rsvp
export const cancelRsvp = async (req,res,next) => {
    try {
        const event = await Event.findById(req.params.id);
        if(!event) return next(new AppError("Event not found",404));

        const before = event.rsvpList.length;
        event.rsvpList = event.rsvpList.filter(
            (r) => r.userId.toString() === req.user._id.toString()
        );

        if(event.rsvpList.length === before){
            return next(new AppError("You have not RSVPed for this event",400));
        }
        await event.save();
        res.status(200).json({success: true, message: "RSVP cancelled"});
    } catch (error) {
        next(error);
    }
};

// ─── GET /api/events/:id/attendees (admin/creator only)

export const getAttendees = async (req,res,next) => {
    try {
        const event = await  EventSchema.findById(req.params.id).populate("rsvpList.userId", "name email profilePicture role");
        if(!event) return next(new AppError("Event not found",404));

        if(event.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin'){
            return next(new AppError("Not autohrized",403))
        }
        res.status(200).json({
            success: true,
            total: event.rsvpList.length,
            attendees: event.rsvpList,
        });
    } catch (error) {
        next(error);
    }
}