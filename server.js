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

import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, ()=> console.log(`Server running on port http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`))
    } catch (error) {
        console.error(`Failed to start the server: `,error.message);
        process.exit(1);
    }
}
startServer();