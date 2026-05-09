import JobSchema from "../models/JobSchema.js";
import { AppError } from "../middlewares/errorMiddleware.js";

// POST /api/jobs
export const createJob = async (req,res,next) => {
    try {
        const { title, company, location, type, domain, description, applyLink, deadline } = req.body;
        const job = await JobSchema.create({
            postedBy: req.user._id,
            title,company, location, type, domain, description, applyLink, deadline,
            // isApproved defaults to false — admin must approve
        });

        res.status(201).json({success: true, message: "Job posted successfully. Awaiting admin approval",job,});
    } catch (error) {
        next(error);
    }
};

// ─── GET /api/jobs 
// Public listing — only approved & active jobs

export const getJobs = async (req,res,next) => {
    try {
        const {search, type, domain, location, page = 1,limit = 10} = req.query;

        const filter = {isApproved: true, isActive: true};

        if(type) filter.type = type;
        if(domain) filter.domain = domain;
        if(location) filter.location = {$regex: location, $options: "i"};

        //Exclude expired jobs
            filter.$or = [
                {deadline: {$gte: new Date()}},
                {deadline: null},
            ];

            if(search) {
                filter.$and = [
                    {
                        $or: [
                            {title: {$regex: search, $options: "i"}},
                            {company: { $regex: search, $options: "i" }},
                             { description: { $regex: search, $options: "i" } },
                        ],
                    },
                ];
                delete filter.$or; //avoid conflict
                filter.$or = [{deadline: {$gte: new Date()}}, {deadline: null}]
                const skip = (Number(page) - 1) * Number(limit);
 
    const [jobs, total] = await Promise.all([
      JobSchema.find(filter)
        .populate("postedBy", "name profilePicture currentCompany")
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 }),
      JobSchema.countDocuments(filter),
    ]);
 
    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      jobs,
    });
            }
    } catch (error) {
        next(error);
    }
};

// ─── GET /api/jobs/:id
export const getJobById = async (req,res,next) => {
    try {
        const job = await JobSchema.findById(req.params.id).populate(
            "postedBy",
            "name profilePicture currentCompany currentRole domain" 
        );

        if(!job) return next(new AppError("Job not Found", 404));
        if(!job.isApproved && req.user.role !== 'admin' && job.postedBy._id.toString() !== req.user.id_toString()){
             return next(new AppError("Job not found", 404)); // hide unapproved from other
        }
         res.status(200).json({ success: true, job });
    } catch (error) {
        next(error);
    }
}

// ─── PUT /api/jobs/:id

export const updateJob = async (req,res,next) => {
    try {
        const job = await JobSchema.findById(req.params.id);
        if(!job) return next(new AppError("Job not Found", 404));

        if(!job.postedBy.toString() !== req.user._id.toString() && req.user.tole !== "admin"){
            return next(new AppError("Not authorized to update this job", 403));
        }

        const ALLOWED = ["title", "company", "location", "type", "domain", "description","applyLink","deadline","isActive"];
        const updates = {};
        ALLOWED.forEach((f) => {if(req.body[f] !== undefined) updates[f]=req.body[f];});

        //Reset approval if poster edits (admin re-review needed)

        if(job.postedBy.toString() === req.user._id.toString() && req.user.role !== "admin"){
            updates.isApproved = false;
        }

        const updated = await JobSchema.findByIdAndUpdate(req.params.id, {$set: updates},{new:true, runValidators: true});

        res.status(200).json({ success: true, message: "Job updated", job: updated })
    } catch (error) {
        next(error);
    }
};
// ─── DELETE /api/jobs/:id\\
export const deleteJob = async (req,res,next) => {
    try {
        const job = await JobSchema.findById(req.params.id);
        if(!job) return next(new AppError("Job not found",404));

        if(job.postedBy.toString() !== req.user._id.toString() && req.user.role !== "admin"){
            return next(new AppError("Not authorized to delete this job",403));
        }
        await job.deleteOne();
        res.status(200).json({success: true, message: "Job deleted successfully"});
    } catch (error) {
        next(error);
    }
};

// PATCH /api/jobs/:id/approve (admin)
export const approveJob = async (req,res,next) => {
    try {
        const job = await JobSchema.findByIdAndUpdate(
            req.params.id,
            {isApproved: true},
            {new: true}
        ).populate("postedBy","name email");

        if(!job) return next(new AppError("Job not found",404));
        res.status(200).json({success: true, message: "Job approved and now live", job});
    } catch (error) {
        next(error);
    }
};
// ─── GET /api/jobs/pending (admin)
export const getPendingJobs = async (req,res,next) => {
    try {
        const job = (await JobSchema.find({isApproved: false}).populate("postedBy","name email profilePicture")).toSorted({createdAt: 1});

        res.status(200).json({success: true, total: jobs.length, jobs});
    } catch (error) {
        next(error);
    }
};
// ─── GET /api/jobs/my

export const getMyJobs = async (req,res,next) => {
    try {
        const job = await JobSchema.find({postedBy: req.user._id}).sort({createdAt: -1});
        res.status(200).json({success: true, total: jobs.length, jobs});
    } catch (error) {
        next(error);
    }
}