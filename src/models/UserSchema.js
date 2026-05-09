import mongoose from "mongoose";
import bcrypt from "bcryptjs"

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true,
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        trim: true,
        unique: true,
        lowercase: true
    },
    passwordHash:{
        type: String,
        required: true,
        select: false 
    },
    role:{
        type: String,
        enum: ['admin','student','alumni'],
        default: "student"
    },
    isVerified:{
        type: Boolean,
        default: false
    },
    isApproved:{
        type: Boolean,
        default: false
    },
    profilePicture:{
        type: String,
        default: "", //Cloudinary URL
    },
    bio:{
        type: String,
        maxLength: 500
    },
    phone: String,
    linkedIn: String,
    github: String,

    //Alumni-Specific
    graduationYear: Number,
    currentCompany: String,
    currentRole: String,
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
    isOpenToMentor: {
        type: Boolean,
        default: false,
    },
    isOpenToReferral: {
        type: Boolean,
        default: false,
    },

    //Student-Specific
    enrollmentYear: Number,
    currentSemester: {
        type: Number,
        min: 1,
        max: 8,
    },

    //Auth-Tokens
    refreshTokens: {
        type: [String],
        select: false,
        default: []
    },
    emailVerifyToken: String,
    emailVerifyExpiry: Date,
    passwordResetToken: String,
    passwordResetExpiry: Date,
},
{ timestamps: true}
);

//Indexs
UserSchema.index({graduationYear: 1});
UserSchema.index({domain: 1});
UserSchema.index({currentCompany: 1});
UserSchema.index({role:1 , isApproved: 1});

//Hash Password before saving
UserSchema.pre("save", async function(){
    if(!this.isModified("passwordHash")) return;
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});

//Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.passwordHash);
};

export default mongoose.model("User", UserSchema);