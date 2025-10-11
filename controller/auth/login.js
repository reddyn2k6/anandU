import jwt from "jsonwebtoken";
import user from "../../model/userModel.js";
import sendOtpEmail from "../../utils/sendOtp.js";
import sendWelcomeEmail from "../../utils/sendWelcomeOtp.js";

const generateToken = (id, email) => {
  return jwt.sign({ id, email }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

export const enteremail = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, msg: "Email is required" });
  }

  try {
    const u = await user.findOne({ email });

    if (!u) {
      return res.status(400).json({ success: false, msg: "User doesn't exist" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    u.Otp = otp;
    u.OtpExpireAt = Date.now() + 2 * 60 * 1000; 
    await u.save();

    const mailOptions = {
      from: `${process.env.EMAIL_USER}`,
      to: email,
      subject: "Your OTP Code",
      text: `Your Login OTP for AnandUtsav is ${otp}. This OTP expires in 2 mins.`,
    };

    await sendOtpEmail(email, otp, mailOptions);

    return res.json({ success: true, msg: "OTP Sent" });
  } catch (err) {
    console.error("OTP generation error:", err);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const verifyOtp = async (req, res) => {
  const { email, userOtp } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, msg: "Email is required" });
  }


  try {
    const u = await user.findOne({ email });
    if (!u) {
      return res.status(400).json({ success: false, msg: "User doesn't exist" });
    }

    if (!userOtp) {
      return res.status(400).json({ success: false, msg: "OTP required" });
    }

    // Compare OTP
    if (String(userOtp) !== String(u.Otp)) {
      return res.status(400).json({ success: false, msg: "Invalid OTP" });
    }

    // Check expiry
    if (Date.now() > u.OtpExpireAt) {
      return res.status(400).json({ success: false, msg: "OTP has expired" });
    }

    // OTP is valid → clear it
    u.Otp = "";
    u.OtpExpireAt = 0;
    await u.save();

    // Generate JWT
    const token = generateToken(u._id, u.email);

    // ✅ Set token in cookie
    res.cookie("token", token, {
      httpOnly: true,     // cannot be accessed by JS
      secure: process.env.NODE_ENV === "production", // only HTTPS in production
      sameSite: "strict", // CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Send welcome email (optional)
    await sendWelcomeEmail(u.fullName, u.email);

    return res.status(200).json({
      success: true,
      msg: "OTP verified successfully",
      token, // still return for API clients
      u
    });
  } catch (err) {
    console.error("OTP verification error:", err);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

export default { enteremail, verifyOtp };
