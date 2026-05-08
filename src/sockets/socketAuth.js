import jwt from "jsonwebtoken";
import  cookie  from "cookie";
import UserSchema from "../models/UserSchema.js";

const socketAuth = async (socket,next) => {
    try {
        // Get Token from handshake auth or cookie
        const cookies = socket.handshake.headers?.cookie ? cookie.parse(socket.handshake.headers.cookie) : {};
        const token = socket.handshake.auth?.token || cookies.accessToken;

        if(!token){
            return next(new Error("Authentication error: No token provided"));
        }

        //Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        } catch (jwtError) {
            console.error("JWT verification failed:", jwtError);
            return next(new Error("Authentication error: Invalid Token"));
        }

        if(!decoded?.id){
            console.warn("JWT payload missing id field:", { decoded });
            return next(new Error("Authentication error: Invalid token payload"))
        }

        //GET USER FROM DB
        let user;
        try {
            user = await UserSchema.findById(decoded.id).select("-password");
        } catch (dbError) {
            console.error("Database error fetching user:", dbError);
            return next(new Error("Authentication error: Invalid Token"));
        }

        if(!user){
            return next(new Error("Authentication Error: User not found"));
        }

        //Attach user to socket
        socket.user = user;
        next();
    } catch (error) {
        console.error("SocketAuth unexpected error:", error);
        return next(new Error("Authentication error: Invalid Token"));
    }
};

export default socketAuth