import jwt from "jsonwebtoken";
import UserSchema from "../models/UserSchema.js";

const socketAuth = async (socket,next) => {
    try {
        // Get Token from handshake auth or cookie
        const token = socket.handshake.auth?.token || socket.handshake.headers?.cookie?.split("; ").find((c)=>c.startsWith("accessToken="))?.split("=")[1];

        if(!token){
            return next(new Error("Authentication error: No token provided"));
        }

        //Verify token
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        //GET USER FROM DB
        const user = await UserSchema.findById(decoded.id).select("-password");
        if(!user){
            return next(new Error("Authentication Error: User not found"));
        }

        //Attach user to socket
        socket.user = user;
        next();
    } catch (error) {
        return next(new Error("Authentication error: Invalid Token"));
    }
};

export default socketAuth