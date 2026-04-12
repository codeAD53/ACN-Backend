

export class AppError extends Error{
    constructor(message, statusCode){
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

// * notFound — catches requests to undefined routes.
//  * Mount AFTER all route definitions.

export const notFound = (req,res,next) =>{
        next(new AppError(`Route ${req.originalUrl} not found`, 404));
};
export const globalErrorHandler = (err,req,res,next) => {
        err.statusCode = err.statusCode || 500;
        err.message = err.message || "Internal Server Error";


// Mongoose: document failed validation

if(err.name === "ValidationError"){
    const errors = Object.values(err.errors).map((e)=>e.message);
    return res.status(400).json({success: false, message: "Validation Failed",errors});
}

// Mongoose: duplicate key (e.g. unique email)
if(err.code === 11000){
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({success: false, message: `${field} already exists`});
}
 // Mongoose: invalid ObjectId (e.g. /api/users/not-an-id)

 if(err.name === "CastError"){
    return res.status(400).json({success: false, message: `Invalid ${err.path}: ${err.value}`});
 }

 //JWT: malformed token

 if(err.name === "JsonWebTokenError"){
        return res.status(401).json({success: false, message: "Invalid token"});
 }

 //JWT: expired token
 if(err.name === "TokenExpiredError"){
    return res.status(401).json({success: false, message:" Token expired"});
 }

 //Multer: file is too large
 if(err.code === "LIMIT_FILE_SIZE"){
    return res.status(400).message({success: false, message: "File is too large. MAx Size is 5MB"});
 }

 //Multer: unexpected file field
 if(err.code === "LIMIT_UNEXPECTED_FILE"){
    return res.status(400).json({success: false, message: "Unexpected file field"});
 }

 // Our own AppError (operational,expected)
 if(err.isOperational){
    return res.status(err.statusCode).json({
        success: false, message: err.message,
    });
 }

 //Unknown / programming errors - don't leak details in production
 console.error("UNEXPECTED_ERROR: ",err);
 res.status(500).json({
    success: false,
    message: process.env.NODE_ENV !== 'production' ? "Something went wrong" : err.message,
    ...(process.env.NODE_ENV !=='production' && {stack: err.stack}),
 });
};
