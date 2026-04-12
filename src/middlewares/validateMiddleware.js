import {body, params, validateResult} from 'express-validator';

export const validate = (req,res,next) => {
        const errors = validateResult(req);
        if(!errors.isEmpty()){
            return res.status(400).json({success: false, message: "Validation Failed", errors: errors.array().map((e)=> ({field: e.path, message: e.msg})),
        });
        }
        next();
};

export const registerRules = () => [
    body("name")
        .trim()
        .notEmpty().withMessage("Name is required")
        .isLength({min: 2, max: 50}).withMessage("Name must be between 2 and 50 characters"),
    body("email")
        .trim()
        .notEmpty().withMessage("Name is required")
        .isLength({min: 2, max: 50 }).withMessage("Name must be between 2 and 50 characters.")
        .normalizeEmail(),

        body("password")
        .notEmpty().withMessage("Password is required")
        .isLength({min: 8}).withMessage("Password must be at least 8 characters")
        .matches(/[A-Z]/).withMessage("Password must contain atleast one uppercase letter")
        .matches(/[0-9]/).withMessage("Password must contain at least one number"),

        body("role")
            .optional()
            .isIn(["student", "alumni"]).withMessage("Role mest be student ot alumni"),
        
        body("graduationYear")
            .if(body("role").equals("alumni"))
            .notEmpty().withMessage("Graduation Year is required for alumni")
            .isInt({min: 1980, max: new Date().getFullYear() })
            .withMessage("Invalid graduation Year"),

        body("enrollmentYear")
            .if(body("role").equals("student"))
            .optional()
            .isInt({min: 2000, max: new Date().getFullYear()})
            .withMessage("Invalid enrollment year"),
        
        body("currentSemester")
            .if(body("role").equals("student"))
            .optional()
            .isInt({min: 1, max: 8}).withMessage("Semester must be between 1 and 8"),
            
];

export const loginRules = [
    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Invalid email address")
        .normalizeEmail(),

    body("password")
        .notEmpty().withMessage("Password is required")

];

export const forgotPasswordRules = [
    body("email")
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Invalid email address")
        .trim()
        .normalizeEmail()
];

export const ResetPasswordRules = [
    body("password")
        .notEmpty().withMessage("Password is required")
        .isLength({min: 8}).withMessage("Password must be at least 8 characters")
        .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
        .matches(/[0-9]/).withMessage("Password must contain at least one number"),

        param("token")
            .notEmpty().withMessage("Reset Token is required"),        
];

export const updateProfileRules = [
     body("name")
        .optional()
        .trim()
        .isLength({min:2,max:50}).withMessage("Name must be between 2 and 50 characters"),

        body("bio")
            .optional()
            .isLength({max: 500}).withMessage("Bio cannot exceed 500 characters"),
        body("phone")
            .optional()
            .isMobilePhone().withMessage("Invalid phone number"),
        body("currentSemester")
            .optional()
            .isInt({min: 1 , max: 8}).withMessage("Semester must be between 1 and 8"),

        body("domain")
            .optional()
            .isIn([
                 "Web Development", "Mobile Development", "Machine Learning",
                "Data Science", "DevOps", "Cybersecurity", "Finance","Product Management", "Other",
            ]).withMessage("Invalid domain"),
];

    export const createJobRules = [
        body("title")
            .trim()
            .notEmpty().withMessage("Job title is required"),

        body('company')
            .trim()
            .notEmpty().withMessage("Company name is required"),
        
        body("type")
            .notEmpty().withMessage("Job type is required")
            .isIn(["full-time", "internship", "contract", "part-time"])
            .withMessage("Invalid Job Type"),
        body("description")
            .trim()
            .notEmpty().withMessage("Job Description is required"),

        body("applyLink")
            .trim()
            .notEmpty().withMessage("Apply link is required")
            .isURL().withMessage("Apply link must be a valid URL"),

        body("deadline")
            .optional()
            .isISO8601().withMessage("Deadline must be a valid date"),
    ];

export const createEventRules = [
     body("title")
    .trim()
    .notEmpty().withMessage("Event title is required"),
 
  body("description")
    .trim()
    .notEmpty().withMessage("Event description is required"),

    body("date")
        .notEmpty().withMessage("Event date is required")
        .isISO8601().withMessage("Event date must be a valid date")
        .custom((value)=>{
            if(new Date(value) < new Date()){
                throw new Error("Event date must be in the future");
            }
            return true;
        }),

        body("meetLink")
            .optional()
            .isURL().withMessage("Meet link must be a valid URL"),

        body("maxAttendees")
            .optional()
            .isInt({min: 1}).withMessage("Max attendees must be a positive number"),
];

export const connectionRequestRules = [
    body("targetId")
        .notEmpty().withMessage("Target user ID is required")
        .isMongoId().withMessage("Invalid user ID"),
    
    body("type")
        .notEmpty().withMessage("Connection type is required")
        .isIn(["mentorship", "referral"]).withMessage("Type must be mentorship or referral"),

    body("message")
        .optional()
        .isLength({max: 1000}).withMessage("Message cannot exceed 1000 characters")
]