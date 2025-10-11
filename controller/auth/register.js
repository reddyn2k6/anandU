import jwt from "jsonwebtoken";
import userModel from "../../model/userModel.js";
import sendOtpEmail from "../../utils/sendOtp.js";

// Helper to create JWT
const generateToken = (id, email) => {
  return jwt.sign({ id, email }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// ✅ Step 1: Register → create user & send OTP
export const register = async (req, res) => {
  try {
    const { username, fullName, phone, email, location, gender } = req.body;

    if (!fullName || !phone || !email) {
      return res
        .status(400)
        .json({ success: false, msg: "Required fields missing" });
    }

    let user = await userModel.findOne({ email });

    if (user) {
      return res
        .status(400)
        .json({ success: false, msg: "User already exists" });
    }

    // Generate OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    user = new userModel({
      username,
      fullName,
      phone,
      email,
      location,
      gender,
      Otp: otp,
      OtpExpireAt: Date.now() + 2 * 60 * 1000, // 2 mins expiry
    });

    await user.save();

    const mailOptions = {
      from: `${process.env.EMAIL_USER}`,
      to: email,
      subject: "Your OTP Code",
      text: `Your registration OTP for AnandUtsav is ${otp}. This OTP expires in 2 mins.`,
    };

    await sendOtpEmail(email, otp, mailOptions);

    return res
      .status(200)
      .json({ success: true, msg: "OTP sent to email. Please verify." });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

// ✅ Step 2: Verify OTP → issue JWT + set cookie
export const verifyOtp = async (req, res) => {
  try {
    const { email, userOtp } = req.body;

    const user = await userModel.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, msg: "User not found. Please register again." });
    }

    // Check OTP
    if (String(userOtp) !== String(user.Otp)) {
      return res.status(400).json({ success: false, msg: "Invalid OTP" });
    }

    if (Date.now() > user.OtpExpireAt) {
      return res.status(400).json({ success: false, msg: "OTP expired" });
    }

    // Clear OTP after successful verification
    user.Otp = "";
    user.OtpExpireAt = 0;
    await user.save();

    // Generate JWT
    const token = generateToken(user._id, user.email);

    // ✅ Set token in cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json({
      success: true,
      msg: "OTP verified, registration complete",
      token, // still return in JSON for mobile clients
      u
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

export default { register, verifyOtp };
