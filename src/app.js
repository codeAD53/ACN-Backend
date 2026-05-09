import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { notFound, globalErrorHandler } from './middlewares/errorMiddleware.js';


//Routes imports
import authRoutes from './routes/auth.js'
import userRoutes from './routes/user.js'
import connectionRoutes from './routes/connection.js'
import eventRoutes from './routes/event.js'
import jobRoutes from './routes/job.js'
import galleryRoutes from './routes/gallery.js'
import notificationRoutes from './routes/notification.js'
import chatRoutes from './routes/chat.js'
import messageRoutes from './routes/message.js'


const app = express();


// Security
app.use(helmet());
app.use(cors({
    origin:[
     process.env.CLIENT_URL || "http://localhost:5173",
     "http://localhost:3000",
     "http://127.0.0.1:3000", // ← tester origin
  ],  
    credentials: true,
})
);
app.use(cookieParser());

//Rate-Limiting - general
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {success: false, message: "Too many requests, please try again later"},
});
app.use("/api",limiter);

//Rate Limting - Stricter limit for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: {success: false, message: "Too many auth attempts, please try again later"},
});
app.use("/api/auth",authLimiter);

//Body-Parsing
app.use(express.json({limit: "10mb"}));
app.use(express.urlencoded({extended: true}));

//Request logging
if(process.env.NODE_ENV !== 'production'){
    app.use(morgan("dev"));
}else{
    app.use(morgan("combined"));
}

//Health Check
app.get('/api/health', (req,res)=>{
    res.status(200).json({ success: true, message: "Server is running" });
});

//API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/messages", messageRoutes);

//404 handler - catches any unmatched routes, passes to globalErrorHandler

// app.use((req,res)=>{
//     res.status(404).json({success: false, message: `Route ${req.originalUrl} not found`});
// })
app.use(notFound);

//global error handler
app.use(globalErrorHandler);
    

export default app;