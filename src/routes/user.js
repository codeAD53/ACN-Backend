import express from "express";
import { getMe, updateMe, updateProfilePicture, getPendingUsers, getAlumni, getMentors, getUserById, approveUser, updateUserRole, deleteUser, getUsers } from './controllers/userController.js';

import { protect, restrictTo, requireVerified, requireApproved } from './middlewares/authMiddleware.js';

import { uploadProfilePicture } from "../middlewares/uploadMiddleware.js";

import { updateProfileRules } from "../middlewares/validateMiddleware.js";


const router = express.Router();

//All user routes requires login
router.use(protect);



//Own Profile
    router.get('/me',getMe);
    router.put('/me',requireVerified,updateProfileRules,validate,updateMe);
    router.put('/me/picture',requireVerified,uploadProfilePicture,updateProfilePicture);

    //browse users
    router.get('/',getUsers);
    router.get('/alumni',getAlumni);
    router.get('/mentors',getMentors);

    //Admin Only
    router.get('/pending',restrictTo("admin"),getPendingUsers);
    router.patch('/:id/approve',restrictTo("admin"),approveUser);
    router.patch('/:id/role',restrictTo("admin"),updateUserRole);
    router.delete('/:id',restrictTo("admin"),deleteUser);

    //View any profile - keep last so /alumni, /mentors, /pending don't get caught bu /:id
    router.get("/:id",getUserById)


export default router