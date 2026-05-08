import MessageSchema from "../models/MessageSchema.js";
import ChatSchema from "../models/ChatSchema.js"
import {createNotification} from "../controllers/notificationController.js"

//Track online users: userId -> socketId
const onlineUsers = new Map();

const socketHandler = (io) => {
    io.on("connection", (socket) => {
        const userId = socket.user._id.toString();
        console.log(`🟢 User connected: ${socket.user.name} (${userId})`);

        // ---Online Presence-------

        //Register user as online
        onlineUsers.set(userId, socket.id);

        //Broadcast to everyone that this user is online
        socket.broadcast.emit("user:online", {userId});

        //Send current online users list to the newly connected user
        socket.emit("users:online", Array.from(onlineUsers.keys()));

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
                const {chatId, encryptedContent, iv} = data;
                //Validate required fields
                if(!chatId || !encryptedContent || !iv){
                    socket.emit("error", {message: "chatId, encryptedContent and iv are required"});
                    return;
                }

                //Verify user is number of this chat
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
                    iv, //initialization vector for dercryption
                });

                //Update chat's last message
                await ChatSchema.findByIdAndUpdate(chatId, {
                    lastMessage: message._id,
                    updatedAt: new Date(),
                });

                //Populate sender info before broadcasting
                await message.populate("senderId","name avatar");

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
                const offlineMembers = chat.participants.filter((member)=>member._id.toString() !== userId && !onlineUsers.has(member._id.toString()));

                for(const member of offlineMembers){
                    await createNotification({
                        recipient: member._id,
                        sender: userId,
                        type: "message",
                        message: `${socket.user.name} sent you a message`,
                        reference: chatId,
                        referenceModel: "Chat"
                    });
                }
            } catch (error) {
                socket.emit("error", {message: "Failed to send message"});
            }
        });

        //Typing Indicators
        socket.on("typing:start", ({chatId}) => {
            socket.to(chatId).emit("typing:start", {
                chatId,
                userId,
                name: socket.user.name,
            });
        });

        socket.on("typing:stop", ({chatId})=>{
            socket.to(chatId).emit("typing:stop", {
                chatId,
                userId,
            });
        });

        //READ RECEIPTS

        socket.on("message:read", async ({chatId, messageId}) => {
            try {
                await MessageSchema.findByIdAndUpdate(messageId, {
                    $addToSet: {readBy: userId},
                });

                //NOTIFY OTHER MEMBERS
                socket.to(chatId).emit("message:read", {
                    chatId,
                    messageId,
                    readBy: userId,
                })
            } catch (error) {
                console.error("message:read error",error);
            }
        });

        //Disconnect
        socket.on("disconnect",()=>{
            onlineUsers.delete(userId);
            socket.broadcast.emit("user:offline", {userId});
            console.log(`User disconnected: ${socket.user.name} (${userId})`);
        });

    });
};

export default socketHandler;




