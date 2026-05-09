import jwt from 'jsonwebtoken'
import UserSchema from "../models/UserSchema.js";

export const protect = async (req,res,next) => {
        try {
            const authHeader = req.headers.authorization;

            if(!authHeader || !authHeader.startsWith("Bearer ")){
                return res.status(401).json({success: false, message: "No token provided" });
            }
            const token = authHeader.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

            const user = await UserSchema.findById(decoded.id).select("-passwordHash -refreshTokens");
            if(!user){
                return res.status(401).json({ success: false, message: "User no longer exists" });
            }
            req.user = user;
            next();
        } catch (err) {
            next(err);
        }
};

export const restrictTo = (...roles) => {
    return (req,res,next) => {
        if(!roles.includes(req.user.role)){
            return res.status(403).json({
                success: false,
                message: `Access Denied. Required role: ${roles.join(" or ")}`,
            });
        }
        next();
    };
};

export const requireVerified = (req,res,next) => {
    if(!req.user.isVerified){
        return res.status(403).json({
            success: false,
      message: "Please verify your email address first",
        });
    }
    next();
}
 export const requireApproved = (req,res,next) => {
        if(!req.user.isApproved){
            return res.status(403).json({
                success: false,
      message: "Your account is pending admin approval",
            })
        }
        next();
};

