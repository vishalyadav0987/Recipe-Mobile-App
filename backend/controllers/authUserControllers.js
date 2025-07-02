
const UserSchema = require('../modals/UserSchema');
const crypto = require('crypto');
const bcryptJs = require('bcryptjs');
const { sendVerificationEmail, sendWelcomeEmail, sendForgetPasswordEmail, sendResetPasswordSuccessfullEmail } = require('../nodemailer/email');
const generateAndSetToken = require('../generateToken/generateTokenAndSetToken');
const cloudinary = require('cloudinary').v2;

/*------------------------------------------
            Register Controller
------------------------------------------*/
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const { avatar } = req.body;

        if (!name || !email || !password || !avatar) {
            return res.status(400).json({ success: false, message: "All fields are required." });
        }

        const existingUser = await UserSchema.findOne({ email }).lean();
        if (existingUser) {
            return res.status(400).json({ success: false, message: "User already exists." });
        }

        // Generate password hash & Upload avatar concurrently
        const uploadPromises = [
            bcryptJs.hash(password, 10),
            cloudinary.uploader.upload(avatar, {
                folder: "avatars",
                format: "webp",
                quality: 80,
                width: 150,
                crop: "scale"
            })
        ];

        const [hashedPassword, myCloud] = await Promise.all(uploadPromises);

        const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
        const newUser = new UserSchema({
            name,
            email,
            password: hashedPassword,
            avatar: { 
                public_id: myCloud.public_id, 
                url: myCloud.url 
            },
            verificationToken,
            verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
        });

        await newUser.save();
        const token = generateAndSetToken(newUser._id, res);

        // Send verification email asynchronously
        sendVerificationEmail(newUser.email, verificationToken).catch(err => console.error("Email Error:", err));

        res.status(201).json({ 
            success: true, 
            token, 
            user: newUser, 
            message: "User successfully registered." 
        });
    } catch (error) {
        console.error("Error in registerUser:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Something went wrong in registration!" 
        });
    }
};

/*------------------------------------------
            verify Email Controller
------------------------------------------*/
const verifyEmail = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.json({
                success: false,
                message: "fields are required.",
            })
        }
        const user = await UserSchema.findOne({
            verificationToken: code,
            verificationTokenExpiresAt: { $gt: Date.now() }
        });
        if (!user) {
            return res.json({
                success: false,
                message: "Invalid verification token.",
            })
        }
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpiresAt = undefined
        await user.save();
        await sendWelcomeEmail(user.email, user.name);
        res.json({
            success: true,
            message: "Email verified successfully.",
        })
    } catch (error) {
        console.log("Something went wrong in verifyEmail function: ", error.message);
        return res.status(500).json({ success: false, message: "Something went wrong in verifyEmail!" });
    }
}





/*------------------------------------------
            Login  Controller
------------------------------------------*/
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.json({
                success: false,
                message: "fields are required.",
            })
        }
        const user = await UserSchema.findOne({ email });
        if (!user) {
            return res.json({
                success: false,
                message: "Invalid email or password.",
            })
        }
        const isValidPassword = await bcryptJs.compare(password, user.password);
        if (!isValidPassword) {
            return res.json({
                success: false,
                message: "Invalid email or password.",
            })
        }
        user.lastLogin = new Date();
        await user.save();

        generateAndSetToken(user._id, res);

        res.status(200).json({
            success: true,
            message: "Logged in successfully",
            data: {
                ...user._doc,
                password: undefined,
            }
        })

    } catch (error) {
        console.log("Something went wrong in loginUser function: ", error.message);
        return res.status(500).json({ success: false, message: "Something went wrong in loginUser!" });
    }
}






/*------------------------------------------
            Logout  Controller
------------------------------------------*/
const logoutUser = async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.json({
                success: false,
                message: "You are not logged in.",
            })
        }
        res.clearCookie("token");
        res.json({
            success: true,
            message: "User Successfully logged out."
        })
    } catch (error) {
        console.log("Something went wrong in logoutUser function: ", error.message);
        return res.status(500).json({ success: false, message: "Something went wrong in logoutUser!" });
    }
}





/*--------------------------------------------------
            Forget Password  Controller
----------------------------------------------------*/
const forgetPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Please enter your email address",
            });
        }

        const user = await UserSchema.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found with this email address",
            });
        }

        const resetToken = crypto.randomBytes(20).toString("hex");
        const resetTokenExpiresAt = Date.now() + 3600000; // 1 hour

        user.resetPasswordToken = resetToken;
        user.resetPasswordTokenExpiresAt = resetTokenExpiresAt;
        await user.save();

        // Send password reset email using template literal
        const resetUrl = "{process.env.FRONTEND_URL}/reset-password/{resetToken}";
        await sendForgetPasswordEmail(user.email, resetUrl);

        return res.status(200).json({
            success: true,
            message: "Password reset link has been sent to your email",
        });

    } catch (error) {
        console.error("Error in forgetPassword:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while processing your request",
        });
    }
};




/*--------------------------------------------------
            Reset Password  Controller
----------------------------------------------------*/
const resetPassword = async (req, res) => {
    try {
        const { resetToken } = req.params;
        const { password } = req.body;
        if (!password) {
            return res.json({
                success: false,
                message: "Please enter the new Password",
            })
        }
        const user = await UserSchema.findOne({
            resetPasswordToken: resetToken,
            resetPasswordTokenExpiresAt: { $gt: Date.now() },
        });

        if (!user) {
            return res.json({
                success: false,
                message: "User not found",
            });
        }

        const hashedPassword = await bcryptJs.hash(password, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordTokenExpiresAt = undefined;
        await user.save();

        // SEND EMAIL IF PASSWORD SUCCESFULLY RESET
        sendResetPasswordSuccessfullEmail(user.email)

        res.status(200).json({ success: true, message: "Password reset successful" });

    } catch (error) {
        console.log("Something went wrong in resetPassword function: ", error.message);
        return res.status(500).json({ success: false, message: "Something went wrong in resetPassword!" });
    }
}





/*--------------------------------------------------
            authorizedUser  Controller
----------------------------------------------------*/
const authorizedUser = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        // Fetch the latest user data from the database
        const user = await UserSchema.findById(req.user._id).select("-password");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        console.error("Error in authorizedUser:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


/*--------------------------------------------------
            fetchingToken  Controller
----------------------------------------------------*/

const fetchingToken = async (req, res) => {
    const token = req.cookies?.token;
    res.json({ hasToken: !!token });
}




/*--------------------------------------------------
            get All User Controller -- ADMIN
----------------------------------------------------*/
const getAllUser = async (req, res) => {
    try {
        const users = await UserSchema.find({ isAdmin: false }).select("-password");
        if (!users) {
            return res.status(404).json({
                success: false, message: "No users found"
            });
        }
        res.status(200).json({ success: true, data: users });
    } catch (error) {
        console.error("Error in getAllUser:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

module.exports = {
    registerUser,
    verifyEmail,
    loginUser,
    logoutUser,
    forgetPassword,
    resetPassword,
    authorizedUser,
    fetchingToken,
    getAllUser
}