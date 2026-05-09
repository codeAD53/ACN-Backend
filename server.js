// import "dotenv/config";
// import connectDB from "./config/db";
// import schemas from "./schemas/index";

// const { User } = schemas; //Destructuring User
// const test = async () => {
//     try {
//         await connectDB();
//         const dummy = await User.create({
//             name: "Test user",
//             email: "test@college.edu",
//             passwordHash: "test1234",
//             role: "student",
//         });

//         console.log("✅ Test User created", dummy._id)

//         await User.findByIdAndDelete(dummy_.id);
//         console.log("Test user deleted");
//         process.exit(0);
//     } catch (error) {
//         console.error("❌ Test failed:", error.message);
//         process.exit(1);
//     }
// }
// test();
// end

import "dotenv/config";
import app from "./src/app.js";
import connectDB, { connectRedis, redisClient } from "./src/config/db.js";
import http from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import socketAuth from './src/sockets/socketAuth.js'
import socketHandler from "./src/sockets/socketHandler.js";


const PORT = process.env.PORT || 5000;

// Creating a HTTP server from an Express app
const server = http.createServer(app);

// Attached Socket.IO to HTTP Server

const io = new Server(server, {
    cors: {
        origin: [
            process.env.CLIENT_URL || "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",  // ← tester origin
        ],
        methods: ["GET", "POST"],
        credentials: true,
    },
    pingTimeout: 60000,
    transports: ["websocket"]
});


const startServer = async () => {
    try {

        //MongoDB
        await connectDB();
        //Redis (primary client)
        await connectRedis();

        // Redis adapter for horizontal scaling
        const pubClient = redisClient.duplicate();
        const subClient = redisClient.duplicate();
        await Promise.all([pubClient.connect(), subClient.connect()]);

        io.adapter(createAdapter(pubClient, subClient));
        console.log("Socket.IO Redis adapter ready");
        
        io.use(socketAuth); //Authenticate every socket connection before allowing the events


        //Register all socket event handlers
        socketHandler(io);


        server.listen(PORT, ()=> { 
            console.log(`Server running on port http://localhost:${PORT}` + ` [${process.env.NODE_ENV || "development"}] mode \nSocket Ready`)
    }
);
        

    } catch (error) {
        console.error(`Failed to start the server: `,error.message);
        process.exit(1);
    }
}
startServer();
// docker run --name redis -p 6379:6379 -d redis