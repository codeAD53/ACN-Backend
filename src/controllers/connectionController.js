import ConnectionSchema from "../models/ConnectionSchema.js"
import UserSchema from "../models/UserSchema.js";
import { AppError } from "../middlewares/errorMiddleware.js";

// ─── POST /api/connections
export const sendConnectionRequest = async (req,res,next) => {
    try {
        const {targetId, type, message} = req.body;
        // Can't connect with yourself
        if(targetId === req.user._id.toString()){
            return next(new AppError("You cannot send a connection request to yourself",400));
        }

        // check target user exists
        const target = await UserSchema.findById(targetId);
        if(!target)  return next(new AppError("User not found",404));

        //Check target is open to this connection type
        if(type === "mentorship" && !target.isOpenToMentor){
            return next(new AppError("This user is not open to mentorship requests",400));
        }

         // Unique index on (requesterId, targetId, type) prevents duplicates

         const connection = await Connection.create({
            requesterId: req.user.id,
            targetId,
            type,
            message,
         });

         res.status(201).json({
            success: true,
            message: "Connection request sent",
            connection,
         })
    } catch (error) {
        if(error.code === 11000){
            return next(new AppError("You have already senst a connection request to this user",409));
        }
        next(error);
    }
};

// ─── GET /api/connections 
// Get all connections for the logged-in user (sent + received)

export const getMyConnections = async (req,res,next) => {
        try {
            const {status, type} = req.query;
            const userId = req.user._id;

            const filter = {
                $or: [{requesterId: userId}, {targetId: userId}],
            };
            if(status) filter.status = status;
            if(type) filter.type = type;

            const connections = await Connection.find(filter)
            .populate("requestedId", "name profilePicture role currentCompany domain")
            .populate("targetId", "name profilePicture role currentCompany domain").sort({createdAt: -1});

            res.status(200).json({success: true, total: connections.length, connections});
        } catch (error) {
            next(error);
        }
};
// ─── GET /api/connections/requests
// Incoming pending requests only

export const getIncomingRequests = async (req,res,next) => {
    try {
        const requests = await Connection.find({
            targetId: req.user._id,
            status: "pending",
        }).populate("requestedId", "name profilePicture role currentCompany domain graduationYear").sort({createdAt: -1});

        res.status(200).json({success: true, total: requests.length, requests})
    } catch (error) {
        next(error);
    }
    
};

// ─── PATCH /api/connections/:id/accept 
export const acceptConnection = async (req,res,next) => {
        try {
            const connection = await Connection.findById(req.params.id);
            if(!connection) return next(new AppError("Connection request is not found",404));

            //Only the target can accept
            if(connection.targetId.toString() !== req.user._id.toString()) {
                return next(new AppError("Not authorized to accept this request",403)); }
            if(connection.status !== "pending"){
                return next(new AppError(`Request already ${connection.status}`, 400))
            }
            connection.status = "accepted";
            await connection.save();

            res.status(200).json({ success: true, message: "Connection accepted", connection});

        } catch (error) {
            next(error);
        }
};

export const rejectConnection = async (req,res,next) => {
    try {
        const connection = await Connection.findById(req.params.id);

        if(!connection) return next(new AppError("connection request not found",404));

        if(connection.targetId.toString() !== req.user._id.toString()){
            return next(new AppError("Not authorized to reject this request",403));
        }
        if(connection.status !== pending){
            return next(new AppError(`Request already ${connection.status}`,400));
        }
        connection.status = 'rejected';
        await connection.save();

        res.status(200).json({success: true, message: "Connection rejected"});
    } catch (error) {
        next(error);
    }
};

// ─── DELETE /api/connections/:id 
// Requester can withdraw a pending request

export const withdrawConnection = async (req, res, next) => {
  try {
    const connection = await Connection.findById(req.params.id);
    if (!connection) return next(new AppError("Connection request not found", 404));
 
    if (connection.requesterId.toString() !== req.user._id.toString()) {
      return next(new AppError("Not authorized to withdraw this request", 403));
    }
 
    if (connection.status !== "pending") {
      return next(new AppError("Can only withdraw pending requests", 400));
    }
 
    await connection.deleteOne();
    res.status(200).json({ success: true, message: "Connection request withdrawn" });
  } catch (error) {
    next(error);
  }
};