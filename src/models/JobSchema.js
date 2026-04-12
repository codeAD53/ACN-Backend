import mongoose from "mongoose";

const JobSchema = new mongoose.Schema({
    postedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    title: {
        type: String,
        required: [true,"Job Title is required"],
        trim: true,
    },
    company: {
        type: String,
        required: true,
    },
    location: {
        type: String,
        default: "Remote",
    },
    type:{
        type: String,
        enum: ['full-time', 'internship','contract','part-time'],
        required: true,
    },
    domain: {
      type: String,
      enum: [
        "Web Development",
        "Mobile Development",
        "Machine Learning",
        "Data Science",
        "DevOps",
        "CyberSecurity",
        "Finance",
        "Product Management",
        "Other",
      ],
    },
    description: {
      type: String,
      required: true,
    },
    applyLink: {
      type: String,
      required: true,
    },
    isApproved: {
      type: Boolean,
      default: false, // admin must approve before it goes live
    },
    deadline: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);
 
// Indexes
JobSchema.index({ postedBy: 1 });
JobSchema.index({ domain: 1 });
JobSchema.index({ type: 1 });
JobSchema.index({ deadline: 1 });
JobSchema.index({ isApproved: 1, isActive: 1 });
 
export default mongoose.model("Job", JobSchema);
