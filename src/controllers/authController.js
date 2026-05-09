import crypto from 'crypto';
import jwt from 'jsonwebtoken'
import UserSchema from '../models/UserSchema.js';
import {sendTokens, generateAccessToken, generateRefreshToken} from "../utils/generateTokens.js"


export const register = async (req,res,next) => {
    try {
        //Register
        const {name, email, password, role, graduationYear, enrollmentYear, currentSemester } = req.body;

        // Check duplicate email
        const existingUser = await UserSchema.findOne({email});
        if(existingUser){
            return res.status(409).json({success: false, message: "Email already register"});
        }
         // Only allow student or alumni on self-register (not admin) // Only allow student or alumni on self-register (not admin)

         const allowedRoles = ["student", "alumni"];
         if(role && !allowedRoles.includes(role)){
            return res.status(400).json({success: false, message: "Invalid Role. Self Registration only allows students and admins."});
         }

         const emailVerifyToken = crypto.randomBytes(32).toString("hex");
         const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); //24 hr

         const user = await UserSchema.create({
            name,
            email,
            passwordHash: password,
            role: role || "student",
            graduationYear: role === "alumni" ? graduationYear : undefined,
            enrollmentYear: role === "student" ? enrollmentYear : undefined,
            currentSemester: role === "student" ? currentSemester : undefined,
            emailVerifyToken,
            emailVerifyExpiry,
         });

         try {
            await sendVerificationEmail(user, emailVerifyToken);
         } catch (emailError) {
            console.error("Failed to send verification email:",emailError.message);
         }
         res.status(201).json({
            success: true,
            message: "Registration Successful. Please check your email to verify your account.",
            user: {
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified,
            },
         });
    } catch (error) {
        next(error);
    }
};

// Verify Email
export const verifyEmail = async (req,res,next) => {
    try {
        const {token} = req.params;
        const user = await UserSchema.findOne({
            emailVerifyToken: token,
            emailVerifyExpiry: { $gt: Date.now() },
        });

        if(!user){
            return res.status(400).json({
                success: false, message: "Invalid or expired verification link",
            });
        }

        user.isVerified = true;
        user.emailVerifyToken = undefined;
        user.emailVerifyExpiry = undefined;
        await user.save({ validateBeforeSave: false});

        res.status(200).json({success: true, message: "Email verified successfully. You can now log in"});
    } catch (error) {
        next(error);
    };
};

// Login
export const login = async (req,res,next) => {
    try {
        const {email, password} = req.body;

        if(!email || !password){
            return res.status(400).json({success: false, message: "Email and password are required"})
        }

        const user = await UserSchema.findOne({email}).select("+passwordHash +refreshTokens");
        if(!user){
            return res.status(401).json({success: false, message: "Invalid email or password"});
        }

        const isMatch = await user.comparePassword(password);
        if(!isMatch){
            return res.status(401).json({success: false, message: "Invalid email or password"});
        }

        if(!user.isVerified){
            return res.status(403).json({
                success: false,
                message: "Please verify your email before logging in",
      });

        }

        const refreshToken = generateRefreshToken(user._id);

        user.refreshTokens = [...(user.refreshTokens || []), refreshToken].slice(-5);
        await user.save({validateBeforeSave: false});

        res.cookie("refreshToken",refreshToken,{
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.status(200).json({
            success: true,
            message: "Logged in Successfully",
            accessToken: generateAccessToken(user._id, user.role),
            user:{
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified,
                isApproved: user.isApproved,
                profilePicture: user.profilePicture,
            },
        });
    } catch (error) {
        next(error);
    }
};

//Refresh token

export const refreshToken = async (req,res,next) =>{
    try {
        const token = req.cookies.refreshToken;
        if(!token){
            return res.status(401).json({success: false ,message: "NO refresh token provided"});
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        } catch  {
            return res.status(401).json({success: false, message: "Invalid or expired refresh token"})
        }

        const user = await UserSchema.findById(decoded.id).select("+refreshTokens");
        if(!user || !user.refreshTokens.includes(token)){
            if(user){
                user.refreshTokens = [];
                await user.save({validateBeforeSave: false});
            }
            return res.status(401).json({success: false, message: "Refresh token reuse detected. Please log in again"});
        }

        const newRefreshToken = generateRefreshToken(user._id);
        user.refreshTokens = user.refreshTokens.filter((t)=> t !== token);
        user.refreshTokens.push(newRefreshToken);
        await user.save({validateBeforeSave: false});

        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7*24*60*60*1000,
        });
        res.status(200).json({
            success: true,
            accessToken: generateAccessToken(user._id, user.role),
        });
    } catch (error) {
        next(error);
    }
};

export const logout = async(req,res,next) => {
    try {
        const token = req.cookies.refreshToken;

        if(token){
            const decoded = jwt.decode(token);
            if(decoded?.id){
                await UserSchema.findByIdAndUpdate(decoded.id,{
                    $pull: {refreshTokens: token},
                });
            }
        }

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        });
        res.status(200).json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        next(error);
    }
}

export const forgotPassword = async(req,res,next) => {
        try {
            const {email} = req.body;

            const user = await UserSchema.findOne({email});

            if(!user){
                return res.status(200).json({
                    success: true,
                    message: "If that email is registered, you'll receive a reset link shortly",
                });
            }

            const resetToken = crypto.randomBytes(32).toString("hex");
            user.passwordResetToken = resetToken;
            user.passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000) //1hr
            await user.save({validateBeforeSave: false});

            try {
                await sendPasswordResetEmail(user,resetToken);
            } catch (emailError) {
                user.passwordResetToken = undefined;
                user.passwordResetExpiry = undefined;
                await user.save({validateBeforeSave: false});
                return next(new Error("Failed to send reset email you'll receive a reset link shortly"))
            }

            res.status(200).json({
                success: true,
                message: "If that email is registered, you'll receive a reset link shortly",
            });
        } catch (error) {
            next(error);
        }
};

export const ResetPassword = async (req,res,next) => {
    try {
        const {token} = req.params;
        const {password} = req.body;

        if(!password || password.length < 8){
             return res.status(400).json({
            success: false,
            message: "Password must be at least 8 characters",
        });
    } 
    const user = await UserSchema.findOne({
        passwordResetToken: token,
        passwordResetExpiry: { $gt: Date.now() },
    }).select("+refreshTokens");

    if(!user){
        return res.status(400).json({success: false, message: "Invalid or expired reset link"});
    }

    user.passwordHash = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;

    user.refreshTokens = [];
    await user.save();

    res.clearCookie("refreshToken",{
         httpOnly: true,
         secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
    });

    res.status(200).json({
        success: true,
      message: "Password reset successful. Please log in with your new password.",
    })
}
    catch (error) {
        next(error);
    }
};

export const getMe = async (req,res,next) => {
    try {
        res.status(200).json({success: true, user: req.user});
    } catch (error) {
        next(error)
    }
}