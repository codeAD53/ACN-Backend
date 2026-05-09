import express from "express";

import { createJob, getJobs, getJobById, updateJob, deleteJob, approveJob, getPendingJobs, getMyJobs } from '../controllers/jobController.js';

import { protect, restrictTo, requireApproved, requireVerified } from "../middlewares/authMiddleware.js";
const router = express.Router();

import { createJobRules, validate } from "../middlewares/validateMiddleware.js";

router.use(protect);

// router.get('/',(req,res)=>{
//     res.json({success: true, message: "job route working"});
// });

// Specific routes first (before /:id)
router.get('/my', getMyJobs);
router.get('/pending', restrictTo("admin"), getPendingJobs);
router.patch('/:id/approve', restrictTo("admin"), approveJob);

//Browse Jobs - 
router.get('/',getJobs);
router.get('/:id', getJobById);

//Alumni/admin only can post jobs
router.post('/', restrictTo("alumni","admin"), requireApproved,requireVerified,createJobRules,validate,createJob);
router.put('/:id', requireVerified, updateJob);
router.delete('/:id', requireVerified, deleteJob);

export default router