import UserSchema from '../models/UserSchema'
import { AppError } from '../middlewares/errorMiddleware'
import { deleteFromCloudinary } from '../middlewares/uploadMiddleware'

//  ─── GET /api/users/me 

export const getMe = async (req,res,next) => {
        try {
            res.status(200).json({success: true, user: req.user});
        } catch (error) {
            next(error);
        }
};

// PUT /api/users/me

export const updateMe =async (req,res,next) => {
    try {
        const ALLOWED_FIELDS = [
            "name", "bio", "mobile number", "linkedin", "github",
            "currentCompany", "currentRole", "domain",
            "isOpenToMentor", "isOpenToReferral", "currentSemester", "enrollmentYear"
        ];

        // only pick allowed fields - prevent role/isApproved/isVerified tampering

        const updates = {};
        ALLOWED_FIELDS.forEach((field)=>{
            if(req.body[field] !== undefined) updates[field] = req.body[field];
        })

        const user = await UserSchema.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            {new: true, runValidators: true});

            res.status(200).json({success: true, message: "Profile updated", user})
    } catch (error) {
        next(error);
    }
};

export const updateProfilePicture = async (req,res,next) => {
    try {
        if(!req.file){
            return next(new AppError("Please upload an image",400));
        }
        const user = await UserSchema.findById(req.user._id);

        //Delete an old picture from cloudinary if it exists

        if(user.profilePicture){
            await deleteFromCloudinary(user.profilePicture);
        }

        user.profilePicture = req.file.path; //Cloudinary URL
        await user.save({ validateBeforeSave: false});

        res.status(200).json({ success: true, message: "ProfilePicture: ",profilePicture: user.profilePicture})
    } catch (error) {
        next(error);
    };
};

// GET /api/users
//Search and browse users with filters and pagination
export const getUsers = async (req,res,next) => {
    try {
        const {
            search,
            role,
            domain,
            graduationYear,
            isOpenToMentor,
            isOpenToReferral,
            page = 1,
            limit = 12,
        } = req.query;

        const filter = { isApproved: true};

        if(role) filter.role = role;
        if(domain) filter.domain = domain;
        if(graduationYear) filter.graduationYear = Number(graduationYear);
        if(isOpenToMentor === 'true') filter.isOpenToMentor = true;
        if(isOpenToReferral === 'true') filter.isOpenToReferral = true;

        if(search){
            filter.$or = [
                { name: {$regex: search, $options: '1'}},
                {currentCompany: {$regex: search, $options: "i"}},
                {currentRole: {$regec: search, $options: "i"}}
            ];
        }
        const skip = (Number(page) - 1) * Number(limit);
        const [users, total] = await Promise.all([
            UserSchema.find(filter)
                      .select("name email role profilePicture bio domain currentCompany currentRole graduationYear isOpentoMentor isOpenToReferral")
                      .skip(skip)
                      .limit(Number(limit))
                      .sort({ createdAt: -1}),
                UserSchema.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            users,
        });

    } catch (error) {
        next(error);
    }
};
// ─── GET /api/users/alumni 
export const getAlumni = async (req,res,next) => {
    try {
        const {domain, graduationYear, page = 1, limit = 12} =req.query;

        const filter = { role: "alumni", isApproved: true};
        if(domain) filter.domain = domain;
        if(graduationYear) filter.graduationYear = Number(graduationYear);

        const skip = (Number(page) - 1) * Number(limit);

        const [alumni, total] = new Promise.all([
            UserSchema.find(filter)
                    .select("name profilePicture bio domain currentCompany currentRole graduationYear isOpenToMentor isOpenToReferral")
                    .skip(skip)
                    .limit(Number(limit))
                    .sort({graduationYear: -1}),
                UserSchema.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            alumni,
        })
    } catch (error) {
        next(error);
    }
}

// GET /api/users/mentors

export const getMentors = async (req,res,next) => {
    try {
        const {domain, page = 1, limit = 12} =req.query;

        const filter = {role: "alumni", isApproved: true, isOpenToMentor: true};

        if(domain) filter.domain = domain;
        const skip = (Number(page) - 1) * Number(limit);

        const [mentors, total] = await Promise.all([
            UserSchema.find(filter)
                    .select("name profilePicture bio domain currentCompany currentRole graduationYear")
                    .skip(skip)
                    .limit(Number(limit))
                    .sort({ createdAt: -1}),
                UserSchema.countDocuments(filter),
        ]);

        res.status(200)
            .json({success: true, 
                    total,
                    page: Number(page),
                        pages: Math.ceil(total / Number(limit)),
                        mentors
    })
            
    } catch (error) {
        next(error);
    }
};

 //GET /api/users/:id

export const getUserById = async (req,res,next) => {
    try {
        const user = await UserSchema.findById(req.params.id).select("name email role profilePicture bio domain currentCompany currentRole graduationYear enrollmentYear isOpenToMentor isOpenToReferral linkedin github createdAt");
            if(!user) return next(new AppError("User not Found", 404));
           res.status(200)
            .json({success: true, 
                   user
    })    
    } catch (error) {
        next(error);
    }
};

// ─── GET /api/users/pending (admin)
export const getPendingUsers = async (req,res,next) => {
    try {
        const {page = 1, limit = 20} = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const [users, total] = await Promise.all([
            UserSchema.find({isApproved: false})
                .select("name email role graduationYear enrollmentYear createdAt isVerified")
                    .skip(skip)
                    .limit(Number(limit))
                    .sort({createdAt: 1}), //oldest first , so nothing stays pending forever
                    UserSchema.countDocuments({isApproved: false})
        ]);

        res.status(200).json({success: true, total, page: Number(page), users});
    } catch (error) {
        next(error);
    }
};

//PATCH /api/users/:id/approve (admin)

export const approveUser = async (req,res,next) => {
    try {
        const user = await UserSchema.findByIdAndUpdate(
            req.params.id,
            {isApproved: true},
            {new: true},
        ).select("name email role isApproved");

        if(!user) return next(new AppError("User not found", 404));

        res.status(200).json({success: true, message: `${user.name} has been approved`,user});
    } catch (error) {
        next(error);
    }
}
// ─── PATCH /api/users/:id/role (admin)
export const updateUserRole = async (req,res,next) => {
    try {
        const { role } = req.body;
        if(!["student","alumni", "admin"].includes(role)){
            return next(new AppError("Invalid role",400));
        }

        // Prevent demoting yourself
        if(req.params.id === req.user._id.toString()){
            return next(new AppError("You cannot change your own role", 400));
        }

        const user = await user.findByIdAndUpdate(
            req.params.id,
            {role}, {new: true}
        ).select("name email role");

        if(!user) return next(new AppError("User not found", 404));

        res.status(200).json({success: true, message: `Role Updated to ${role}`, user})
    } catch (error) {
        next(error);
    }
};

// DELETE /api/users/:id (admin)

export const deleteUser = async (req,res,next) => {
    try {
        if(req.params.id === req.user._id.toString()){
            return next(new AppError("You cannot delete your own account",400));
        }
        const user = await UserSchema.findByIdAndDelete(req.params.id);
        if(!user) return next(new AppError("User not found", 404));

         // Clean up profile picture from Cloudinary
    if (user.profilePicture) {
      await deleteFromCloudinary(user.profilePicture);
    };

    res.status(200).json({success: true, message: "User De;eted successfully"});
    } catch (error) {
        next(error);
    }
}

