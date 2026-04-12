import express from "express";
import { register, login, logout, verifyEmail, refreshToken, forgotPassword, ResetPassword, getMe } from "../controllers/authController.js";

import {protect} from "../middlewares/authMiddleware.js"

const router = express.Router();

router.post('/register',register);
router.post('/login',login);
router.post('/logout',logout);
router.post('/verify-email/:token',verifyEmail);
router.post('/refresh-Token',refreshToken);
router.post('/forgot-password',forgotPassword);
router.post('/reset-Password/:token',ResetPassword);

router.get('/me',protect,getMe)

export default router