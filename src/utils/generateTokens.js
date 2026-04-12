import jwt from 'jsonwebtoken'

export const generateAccessToken = (userId, role) => {
    return jwt.sign(
        {
            id: userId, role
        },
        process.env.JWT_ACCESS_SECRET,
        {expiresIn: "15min"}
    );
};

export const generateRefreshToken = (userId) => {
    return jwt.sign(
        { id: userId, },
        process.env.JWT_REFRESH_SECRET,
        {expiresIn: "7d"}
    );
};

export const sendTokens = (res,user,statusCode=200,message="Success") => {  
        const accessToken = generateAccessToken(user._id,user.role);
        const refreshToken = generateRefreshToken(user._id);

        //httpOnly cookie - not accessible via JS, prevents XSS
        res.cookie("refreshToken",refreshToken,{
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7days in ms
        });

        res.status(statusCode).json({
            success: true, message, accessToken,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified,
                isApproved: user.isApproved,
                profilePicture: user.profilePicture,
            },
        });
        return refreshToken; //return so we can store in DB
}