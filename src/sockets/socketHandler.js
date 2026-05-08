import MessageSchema from "../models/MessageSchema.js";
import ChatSchema from "../models/ChatSchema.js"
import {createNotification} from "../controllers/notificationController.js"
import { redisClient } from "../config/db.js";

//Presence TTL in seconds (30 minutes)
const PRESENCE_TTL = 30 * 60;

// Helper function to refresh presence TTL
const refreshPresence = async (userId) => {
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

const socketHandler = (io) => {
    io.on("connection", async (socket) => {
        const userId = socket.user._id.toString();
        // Start heartbeat: refresh presence every 15 minutes (half of 30-minute TTL)
        socket._presenceHeartbeat = setInterval(() => {
            refreshPresence(userId);
        }, (PRESENCE_TTL * 1000 / 2));
        console.log(`🟢 User connected: ${socket.user.name} (${userId})`);

        // ---Online Presence-------

        //Register user as online (multi-tab support)
        const presenceKey = `presence:${userId}`;
        const socketKey = socket.id;

        try {
            // Add socket to user's presence set
            await redisClient.sAdd(presenceKey, socketKey);
            // Set TTL for presence (refreshed on activity)
            await redisClient.expire(presenceKey, PRESENCE_TTL);

            // Check if this is the first connection for this user
            const socketCount = await redisClient.sCard(presenceKey);
            const isFirstConnection = socketCount === 1;

            //Broadcast to everyone that this user is online (only on first connection)
            if (isFirstConnection) {
                socket.broadcast.emit("user:online", {userId});
            }

            //Send current online users list to the newly connected user
            const onlineUserIds = await redisClient.keys('presence:*');
            const onlineUsers = onlineUserIds.map(key => key.replace('presence:', ''));
            socket.emit("users:online", onlineUsers);
        } catch (error) {
            console.error('Redis presence error on connect:', error);
        }

        //JOIN CHAT ROOMS

        socket.on("chat:join", async (chatId)=>{
            try {
                //Verify user is a member of this chat
                const chat = await ChatSchema.findOne({
                    _id: chatId,
                    participants: userId,
                });

                if(!chat){
                    socket.emit("error",{ message: "Chat not found or access denied"})
                    return;

                }
                socket.join(chatId);
                console.log(`📌 ${socket.user.name} joined chat: ${chatId}`);
            } catch (error) {
                socket.emit("error", {message: "Failed to join chat"});
            }
        });

        socket.on("chat:leave", (chatId)=>{
            socket.leave(chatId);
            console.log(`📤 ${socket.user.name} left chat: ${chatId}`);
        });

        //Messaging

        socket.on("message:send", async (data) => {
            try {
                // Refresh presence on activity
                await refreshPresence(userId);

                const {chatId, encryptedContent, iv} = data;
                //Validate required fields
                if(!chatId || !encryptedContent || !iv){
                    socket.emit("error", {message: "chatId, encryptedContent and iv are required"});
                    return;
                }

                //Verify user is member of this chat
                const chat = await ChatSchema.findOne({
                    _id: chatId,
                    participants: userId,
                }).populate("participants", "name avatar");

                if(!chat){
                    socket.emit("error", {message: "Chat not found or access denied"})
                    return;
                }

                //Save encrypted message to DB

                const message = await MessageSchema.create({
                    chatId,
                    senderId: userId,
                    encryptedContent, //store only encrypted content
                    iv, //initialization vector for decryption
                });

                // Populate sender info before updating the chat so any populate error happens first
                await message.populate("senderId","name avatar");

                //Update chat's last message
                await ChatSchema.findByIdAndUpdate(chatId, {
                    lastMessage: message._id,
                });

                //Broadcast to all members in the chat room
                io.to(chatId).emit("message:receive",{
                    _id: message._id,
                    chatId,
                    sender: message.senderId,
                    encryptedContent,
                    iv,
                    createdAt: message.createdAt,
                });

                //Send Notification to offline members
                const offlineMembers = [];
                for (const member of chat.participants) {
                    const memberId = member._id.toString();
                    if (memberId === userId) continue;

                    try {
                        const isOnline = await redisClient.exists(`presence:${memberId}`);
                        if (!isOnline) {
                            offlineMembers.push(member);
                        }
                    } catch (error) {
                        console.error('Redis presence check error:', error);
                        // If Redis fails, assume offline to be safe
                        offlineMembers.push(member);
                    }
                }

                const notificationResults = await Promise.allSettled(
                    offlineMembers.map((member)=>
                    createNotification({
                        recipient: member._id,
                        sender: userId,
                        type: "message",
                        message: `${socket.user.name} sent you a message`,
                        reference: chatId,
                        referenceModel: "Chat"
                    })
                    )
                );
                for(const result of notificationResults){
                    if(result.status === "rejected"){
                        console.error("notification create error",result.reason);
                    }
                }
            } catch (error) {
                socket.emit("error", {message: "Failed to send message"});
            }
        });

        //Typing Indicators
        socket.on("typing:start", ({chatId}) => {
            if(!socket.rooms.has(chatId)){
                socket.emit("error",{message:"Chat not joined or access denied"});
                return;
            }
            socket.to(chatId).emit("typing:start", {
                chatId,
                userId,
                name: socket.user.name,
            });
        });

        socket.on("typing:stop", ({chatId})=>{
            if(!socket.rooms.has(chatId)){
                socket.emit("error",{message: "Chat not joined or access denied"});
                return;
            }
            socket.to(chatId).emit("typing:stop", {
                chatId,
                userId,
            });
        });

        //READ RECEIPTS

        socket.on("message:read", async ({chatId, messageId}) => {
            try {
                // Refresh presence on activity
                await refreshPresence(userId);

                const message = await MessageSchema.findById(messageId);
                if (!message) {
                    socket.emit("error", {message: "Message not found"});
                    return;
                }

                if (message.chatId.toString() !== chatId) {
                    console.error(`Unauthorized: message ${messageId} does not belong to chat ${chatId}`);
                    socket.emit("error", {message: "Unauthorized access to message"});
                    return;
                }

                
                const chat = await ChatSchema.findById(chatId);
                if (!chat) {
                    socket.emit("error", {message: "Chat not found"});
                    return;
                }

                const isParticipant = chat.participants.some(participant =>
                    participant.toString() === userId
                );

                if (!isParticipant) {
                    socket.emit("error", {message: "Chat not found or access denied"});
                    return;
                }

                
                const updated = await MessageSchema.findByIdAndUpdate(
                    messageId,
                    { $addToSet: { readBy: userId } },
                    {new: true}
                );

                if (!updated) {
                    socket.emit("error", {message: "Failed to mark message as read"});
                    return;
                }

                //NOTIFY OTHER MEMBERS
                socket.to(chatId).emit("message:read", {
                    chatId,
                    messageId,
                    readBy: userId,
                })
            } catch (error) {
                console.error("message:read error", error);
                socket.emit("error", {message: "Failed to mark message as read"});
            }
        });

        //Disconnect
        socket.on("disconnect", async ()=>{
            // Clear presence heartbeat
            if (socket._presenceHeartbeat) {
                clearInterval(socket._presenceHeartbeat);
            }
            const presenceKey = `presence:${userId}`;
            const socketKey = socket.id;

            try {
                // Remove socket from user's presence set
                await redisClient.sRem(presenceKey, socketKey);

                // Check if user has any remaining sockets
                const remainingSockets = await redisClient.sCard(presenceKey);

                //Only emit user:offline when all sockets are disconnected
                if (remainingSockets === 0) {
                    // Clean up the presence key
                    await redisClient.del(presenceKey);
                    socket.broadcast.emit("user:offline", {userId});
                }
            } catch (error) {
                console.error('Redis presence error on disconnect:', error);
            }

            console.log(`User disconnected: ${socket.user.name} (${userId})`);
        });

    });
};

export default socketHandler;




