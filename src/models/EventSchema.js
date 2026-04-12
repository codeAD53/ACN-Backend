import mongoose from "mongoose";

const rsvpSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    rsvpedAt: {
        type: Date,
        default: Date.now, //Passing the function reference, not the result(This sets a fixed timestamp when the file first loads)
    },
},
{_id: false}
);

const EventSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true,"Event title is required"],
            trim: true,
        },
        description: {
            type: String,
            required: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        date:{
            type: Date,
            required: true,
        },
        location: {
            type: String,
            default: "Online",
        },
        meetLink: String,
        bannerImage: String,
        rsvpList: [rsvpSchema],
        maxAttendees: {
            type: Number,
            default: null //unlimited
        },
        status:{
            type: String,
            enum: ["upcoming","ongoing","completed","cancelled"],
            default: "upcoming",
        },
    },
{timestamps: true});

EventSchema.index({date: 1});
EventSchema.index({status: 1});

EventSchema.virtual("attendeeCount").get(function (){
    return this.rsvpList.length;
});

export default mongoose.model("Event",EventSchema);