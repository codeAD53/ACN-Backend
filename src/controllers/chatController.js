import ChatSchema from "../models/ChatSchema";
import MessageSchema from "../models/MessageSchema";
import { AppError } from "../middlewares/errorMiddleware";

// ════════════════════════════════════════════════════
// CHAT CONTROLLERS
// ════════════════════════════════════════════════════
 
// ─── POST /api/chats ──────────────────────────────────────────
// Start or retrieve an existing 1-on-1 chat

export const getOrCreateChats = async (req,res,next) => {
        try {
            const {participantId} = req.body;
            if(!participantId) return next(new AppError("Participant ID is required",400));
            if(participantId === req.user._id.toString()){
                return next(new AppError("Cannot start a chat with yourself", 400));
            }

            // Check if a 1-on-1 chat already exists between these two users

            let chat = await ChatSchema.findOne({
                isGroup: false,
                participants: { $all: [req.user._id, participantId], $size: 2},
            }).populate("participants", "name profilePicture role").populate("lastMessage");

            if(!chat){
                chat = await ChatSchema.create({
                    participantId: [req.user._id, participantId],
                    isGroup: false,
                });
                await chat.populate("participants", "name profilePicture role");
            }
            res.status(200).json({success: true, chat});
        } catch (error) {
            next(error);
        }
};

// ─── POST /api/chats/group
export const createGroupChat = async (req,res,next) => {
    try {
        const {groupName, participantIds } = req.body;

        if(!groupName) return next(new AppError("Group name is required", 400));
        if(!participantIds || participantIds.length < 2) return next(new AppError("A group needs at least 2 other participants", 400));

        const participants = [...new Set([...participantIds, req.user._id.toString()])];

        const chat = await ChatSchema.create({
            participants,
            isGroup: true,
            groupName,
            groupAdmin: req.user._id,
        });

        await chat.populate("participants", "name profilePicture role");

        res.status(201).json({ success: true, message: "Group chat created", chat });
    } catch (error) {
        next(error);
    }
};

// ─── GET /api/chats 
// Get all chats for the logged-in user

export const getMyChats = async (req,res,next) => {
    try {

        const chats = await ChatSchema.find({participants: req.user._id}).populate("participants", "name profilePicture role").populate("lastMessage").sort({updatedAt: -1});

        res.status(200).json({ success: true, total: chats.length, chats });
    } catch (error) {
        next(error);
    }
};

// ════════════════════════════════════════════════════
// MESSAGE CONTROLLERS
// ════════════════════════════════════════════════════
 
// ─── POST /api/messages ───────────────────────────────────────

export const sendMessage = async (req,res,next) => { 
    try {
        const {chatId, content, mediatype} = req.body;

        if(!chats) return next(new AppError("Chat ID is required", 400));
        if(!content && req.file) return next(new AppError("Message must have content or media", 400));

        // Verify the sender is a participant
        const chat = await ChatSchema.findOne({_id: chatId, participants: req.user._id});
        if(!chat) return next(new AppError("Chat not found or access denied", 404));

        const message = await MessageSchema.create({
            chatId,
            senderId: req.user._id,
            content: content || null,
            mediaUrl: req.file?.path,
            mediaUrl: req.file ? mediatype || "image" : null,
            readby: [req.user._id], // sender has already "read" their own message
        });

        await ChatSchema.findByIdAndUpdate(chatId, {lastMessage: message._id});
        await message.populate("senderId", "name profilePicture");
        res.status(201).json({ success: true, message });
    } catch (error) {
        next(error);
    }
};
// ─── GET /api/messages/:chatId 
// Paginated message history for a chat

export const getMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 30 } = req.query;
 
    // Verify the requester is a participant
    const chat = await ChatSchema.findOne({ _id: chatId, participants: req.user._id });
    if (!chat) return next(new AppError("Chat not found or access denied", 404));
 
    const skip = (Number(page) - 1) * Number(limit);
 
    const [messages, total] = await Promise.all([
      MessageSchema.find({ chatId })
        .populate("senderId", "name profilePicture")
        .sort({ createdAt: -1 }) // newest first
        .skip(skip)
        .limit(Number(limit)),
      MessageSchema.countDocuments({ chatId }),
    ]);
 
    // Mark fetched messages as read
    await MessageSchema.updateMany(
      { chatId, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );
 
    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      messages: messages.reverse(), // return oldest → newest
    });
  } catch (error) {
    next(error);
  }
};
 
// ─── DELETE /api/messages/:id ─────────────────────────────────
export const deleteMessage = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return next(new AppError("Message not found", 404));
 
    if (message.senderId.toString() !== req.user._id.toString()) {
      return next(new AppError("You can only delete your own messages", 403));
    }
 
    await message.deleteOne();
    res.status(200).json({ success: true, message: "Message deleted" });
  } catch (error) {
    next(error);
  }
};
