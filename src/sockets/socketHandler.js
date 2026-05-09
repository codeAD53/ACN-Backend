import MessageSchema from "../models/MessageSchema.js";
import ChatSchema from "../models/ChatSchema.js"
import {createNotification} from "../controllers/notificationController.js"
import { isRedisReady, redisClient } from "../config/db.js";
import { token } from "morgan";

// Presence TTL: 30 minutes. Key is refreshed on activity and by heartbeat.
const PRESENCE_TTL = 30 * 60;
 
// Heartbeat fires at TTL/3 (10 min) — leaves two full intervals of tolerance
// before a missed beat could expire the key.
const HEARTBEAT_INTERVAL = 10 * 60 * 1000;

// Token-bucket rate limiter for message:send
// Allows burst of 10 then refills at 1 token/second.
const MSG_BUCKET_MAX = 10;
const MSG_REFILL_RATE = 1; //tokens per second


// Helper function to refresh presence TTL
const refreshPresence = async (userId) => {
    if(!isRedisReady()) return;
    try {
        const presenceKey = `presence:${userId}`;
        // Check if key exists; if not, log warning (socket is already tracked, shouldn't happen)
        const exists = await redisClient.exists(presenceKey);
        if (!exists) {
            console.warn(`Presence key missing for user ${userId}, TTL may have expired`);
            return;
        }
        // Refresh TTL by expiring the key
        await redisClient.expire(presenceKey, PRESENCE_TTL);
    } catch (error) {
        console.error('Redis presence refresh error:', error);
    }
};

/**
 * Returns true if the given user currently has at least one active socket.
 * Falls back to true (assume online) on Redis failure to avoid false notifications.
 */
const isUserOnline = async (userId) => {
    if(!isRedisReady()) return;
    try {
        return (await redisClient.exist(`presence:${userId}`)) === 1;
    } catch (error) {
        console.error("Redis presence check error:",error)
        return true; //safe-fallback: don't need inc
    }
};


/**
 * Verifies that userId is a participant of chatId.
 * Optionally populates participant fields for notification dispatch.
 */
const verifyMembership = (chatId, userId, {populate= false} = {}) => {
    const query = ChatSchema.findOne({_id: chatId, participants: userId});
    if(populate){
        query.populate("participants", "name avatar")
    }
    return query;
};

 
/**
 * Consumes one token from the socket's message rate-limit bucket.
 * Returns true if the message is allowed, false if rate-limited.
 */
const consumeMessageToken = (socket) => {
    const now = Date.now();
    const bucket = socket._msgBucket;

    
    // Refill tokens based on elapsed seconds since last check
    const elapsed = (now - bucket.last) / 1000;
    bucket.tokens = Math.min(MSG_BUCKET_MAX,bucket.tokens + elapsed * MSG_REFILL_RATE);
    bucket.last = now;

    if(bucket.tokens < 1) return;
    bucket.tokens -= 1;
    return true;
};



const socketHandler = (io) => {
    io.on("connection", async (socket) => {
        const userId = socket.user._id.toString();
        const userName = socket.user.name;
        console.log(`🟢 User connected: ${userName} (${userId})`);

        //  Rate-limit bucket (per socket)
        socket._msgBucket = {tokens: MSG_BUCKET_MAX, last: Date.now()};

        //  Presence: register socket 
        if (isRedisReady()) {
            try {
                await redisClient.sAdd(`presence:${userId}`, socket.id);
                await redisClient.expire(`presence:${userId}`, PRESENCE_TTL);
 
                // Add to the online users set (O(1) — avoids KEYS scan)
                await redisClient.sAdd("online:users", userId);
 
                // Broadcast online only on first socket for this user
                const socketCount = await redisClient.sCard(`presence:${userId}`);
                if (socketCount === 1) {
                    socket.broadcast.emit("user:online", { userId });
                }
 
                // Send current online list to the newly connected socket
                const onlineUsers = await redisClient.sMembers("online:users");
                socket.emit("users:online", onlineUsers);
 
            } catch (error) {
                console.error("Redis presence error on connect:", error);
            }
        }

         // Heartbeat: refresh presence TTL every 10 minutes 
        socket._presenceHeartbeat = setInterval(
            () => refreshPresence(userId),
            HEARTBEAT_INTERVAL
        );


         //  chat:join 
        socket.on("chat:join", async (chatId) => {
            try {
                const chat = await verifyMembership(chatId, userId);
                if (!chat) {
                    socket.emit("error", {
                        code: "ACCESS_DENIED",
                        message: "Chat not found or access denied",
                    });
                    return;
                }
                socket.join(chatId);
                console.log(`📌 ${userName} joined chat: ${chatId}`);
            } catch (error) {
                console.error("chat:join error:", error);
                socket.emit("error", { code: "SERVER_ERROR", message: "Failed to join chat" });
            }
        });
 
 
        //  chat:leave 
        socket.on("chat:leave", (chatId) => {
            socket.leave(chatId);
            console.log(`📤 ${userName} left chat: ${chatId}`);
        });
 
 
        //  message:send 
        socket.on("message:send", async (data) => {
            // Rate limit check
            if (!consumeMessageToken(socket)) {
                socket.emit("error", {
                    code: "RATE_LIMITED",
                    message: "Too many messages — slow down",
                });
                return;
            }
 
            try {
                const { chatId, encryptedContent, iv } = data;
 
                if (!chatId || !encryptedContent || !iv) {
                    socket.emit("error", {
                        code: "VALIDATION_ERROR",
                        message: "chatId, encryptedContent, and iv are required",
                    });
                    return;
                }
 
                // Verify membership and get participant list for notifications
                const chat = await verifyMembership(chatId, userId, { populate: true });
                if (!chat) {
                    socket.emit("error", {
                        code: "ACCESS_DENIED",
                        message: "Chat not found or access denied",
                    });
                    return;
                }
 
                // Persist message
                const message = await MessageSchema.create({
                    chatId,
                    senderId: userId,
                    encryptedContent,
                    iv,
                });
 
                // Populate sender before broadcasting
                await message.populate("senderId", "name avatar");
 
                // Update chat's lastMessage pointer
                await ChatSchema.findByIdAndUpdate(chatId, { lastMessage: message._id });
 
                // Refresh presence on activity
                await refreshPresence(userId);
 
                // Broadcast to all sockets in the room
                io.to(chatId).emit("message:receive", {
                    _id: message._id,
                    chatId,
                    sender: message.senderId,
                    encryptedContent,
                    iv,
                    createdAt: message.createdAt,
                });
 
                // Notify offline participants only
                const offlineMembers = [];
                for (const member of chat.participants) {
                    const memberId = member._id.toString();
                    if (memberId === userId) continue;
                    const online = await isUserOnline(memberId);
                    if (!online) offlineMembers.push(member);
                }
 
                const notificationResults = await Promise.allSettled(
                    offlineMembers.map((member) =>
                        createNotification({
                            recipient: member._id,
                            sender: userId,
                            type: "message",
                            message: `${userName} sent you a message`,
                            reference: chatId,
                            referenceModel: "Chat",
                        })
                    )
                );
 
                for (const result of notificationResults) {
                    if (result.status === "rejected") {
                        console.error("Notification create error:", result.reason);
                    }
                }
 
            } catch (error) {
                console.error("message:send error:", error);
                socket.emit("error", { code: "SERVER_ERROR", message: "Failed to send message" });
            }
        });
 
 
        //  typing:start ─
        socket.on("typing:start", ({ chatId }) => {
            if (!socket.rooms.has(chatId)) {
                socket.emit("error", {
                    code: "ACCESS_DENIED",
                    message: "Chat not joined or access denied",
                });
                return;
            }
            socket.to(chatId).emit("typing:start", {
                chatId,
                userId,
                name: userName,
            });
        });
 
 
        //  typing:stop 
        socket.on("typing:stop", ({ chatId }) => {
            if (!socket.rooms.has(chatId)) {
                socket.emit("error", {
                    code: "ACCESS_DENIED",
                    message: "Chat not joined or access denied",
                });
                return;
            }
            socket.to(chatId).emit("typing:stop", { chatId, userId });
        });
 
 
        //  message:read ─
        socket.on("message:read", async ({ chatId, messageId }) => {
            try {
                // Single fetch for the message (includes chatId for cross-check)
                const message = await MessageSchema.findById(messageId).lean();
                if (!message) {
                    socket.emit("error", { code: "NOT_FOUND", message: "Message not found" });
                    return;
                }
 
                // Validate message belongs to the claimed chat
                if (message.chatId.toString() !== chatId) {
                    console.error(`Unauthorized: message ${messageId} does not belong to chat ${chatId}`);
                    socket.emit("error", {
                        code: "ACCESS_DENIED",
                        message: "Unauthorized access to message",
                    });
                    return;
                }
 
                // Single query: verify participant membership
                const authorized = await ChatSchema.exists({
                    _id: chatId,
                    participants: userId,
                });
                if (!authorized) {
                    socket.emit("error", {
                        code: "ACCESS_DENIED",
                        message: "Chat not found or access denied",
                    });
                    return;
                }
 
                // Mark as read
                const updated = await MessageSchema.findByIdAndUpdate(
                    messageId,
                    { $addToSet: { readBy: userId } },
                    { new: true }
                );
                if (!updated) {
                    socket.emit("error", {
                        code: "SERVER_ERROR",
                        message: "Failed to mark message as read",
                    });
                    return;
                }
 
                // Refresh presence on activity
                await refreshPresence(userId);
 
                // Notify other room members
                socket.to(chatId).emit("message:read", { chatId, messageId, readBy: userId });
 
            } catch (error) {
                console.error("message:read error:", error);
                socket.emit("error", {
                    code: "SERVER_ERROR",
                    message: "Failed to mark message as read",
                });
            }
        });
 
 
        //  disconnect 
        socket.on("disconnect", async () => {
            // Stop heartbeat immediately
            clearInterval(socket._presenceHeartbeat);
 
            console.log(`🔴 User disconnected: ${userName} (${userId})`);
 
            if (!isRedisReady()) return;
 
            try {
                // Remove this socket from user's presence set
                await redisClient.sRem(`presence:${userId}`, socket.id);
                const remainingSockets = await redisClient.sCard(`presence:${userId}`);
 
                // Only mark user offline when all their tabs/devices are gone
                if (remainingSockets === 0) {
                    await redisClient.del(`presence:${userId}`);
                    await redisClient.sRem("online:users", userId);
                    socket.broadcast.emit("user:offline", { userId });
                }
            } catch (error) {
                console.error("Redis presence error on disconnect:", error);
            }
        });
    });
};
 
export default socketHandler;