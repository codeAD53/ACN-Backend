import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
    chatId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chat",
        required: true,
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    content:{
        type: String,
        trim: true,
        default: null,
    },
    //E2EE fields
    encryptedContent: {
        type: String,
        default: null,
    },
    iv:{
        type: String, //Initialising vector for AES decryption
        default: null,
    },
    mediaUrl: {
        type: String,
        default: null,
    },
    mediaType: {
        type: String,
        enum: ["image","file","video",null],
        default: null,
    },
    readBy: [
        {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User",
        },
    ],
},
 { timestamps: true,
     validate: {
        validator: function(){
            return this.content || this.encryptedContent || this.mediaUrl;
        },
        message: "Message must have content or media",
    },
  }
);

MessageSchema.index({chatId: 1, createdAt: -1});
MessageSchema.index({senderId: 1});


export default mongoose.model("Message",MessageSchema);
