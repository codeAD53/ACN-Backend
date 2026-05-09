import mongoose from "mongoose";
import { createClient } from "redis";

const connectDB = async() => {
try{
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected ${conn.connection.host}`);
}catch(error){
    console.error(`❌ MonogoDB Connection Error ${error.message}`)
    process.exit(1);
}

};

// Redis client for presence tracking
const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('❌ Redis Client Error', err));
redisClient.on('connect', () => console.log('✅ Redis Connected'));

const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch (error) {
        console.error('❌ Redis Connection Error:', error.message);
        // Don't exit process for Redis failure - allow app to start without Redis
    }
};

const isRedisReady = () => {
    return redisClient.isReady;
}

export default connectDB;
export { redisClient, connectRedis, isRedisReady };
