import nodemailer from 'nodemailer'

const createTranporter = () => {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_PORT === "465",
        auth:{
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};

export const sendVerificationEmail = async (user, token) => {
    const transporter = createTranporter();
    const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${token}`;
    await transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME || "Alumni Connect"}" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: "Verify your email Address",
        html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: auto">
            <h2>Hello ${user.name},</h2>
            <p>Thanks for registering! Please verify your email address by clicking the button below.</p>
            <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: #fff;border-radius:6px;text-decoration:none;font-weight:bold;">Verify Email</a>
            <p style="margin-top: 16px; color: #666;">This link expires in <strong>24 hours</strong>.</p>
            <p style="color: #999; font-size: 12px;">If you didn't create an account, you can safely ignore this email</p>
            </div>
            `,
    });
};

export const sendPasswordResetEmail = async (user,token) => {
        const transporter = createTranporter();
        const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;

        await transporter.sendMail({
            from: `"${process.env.EMAIL_FROM_NAME || "Alumni Connect"}" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: "Reset Your Password",
            html: `
                <div style = "font-family: sans-serif; margin: auto; max-width: 500px">
                <h2>Hello ${user.name}</h2>
                <p>We have received a request to reset a password. Click the button below to set a new one.</p>
                <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#4F46E5;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;">Reset Password</a>
                 <p style="margin-top:16px;color:#666;">This link expires in <strong>1 hour</strong>.</p>
                <p style="color:#999;font-size:12px;">If you didn't request a password reset, you can safely ignore this email.</p>
                </div>
                `,
        });
};