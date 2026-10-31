const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../schema/userSchema");
const Otp = require("../schema/otpSchema");
const { sendOtpEmail } = require("../config/mailer");
const { validatePassword } = require("../utils/validators");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "eduhub_super_secret_key_2024";

// POST /api/auth/register
// Step 1 (no otp): validates inputs & sends 6-digit OTP to user's email
// Step 2 (with otp): verifies code & creates account in MongoDB
router.route("/register").post(async (req, res) => {
  try {
    const { name, email, password, otp, dob, age } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
        result: null,
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already in use",
        result: null,
      });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message,
        result: null,
      });
    }

    // Step 1: If OTP is not provided, generate code & email it to user
    if (!otp) {
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

      await Otp.findOneAndUpdate(
        { email: cleanEmail },
        { otp: generatedOtp, createdAt: new Date() },
        { upsert: true, new: true }
      );

      await sendOtpEmail(cleanEmail, generatedOtp, name.trim());

      return res.status(200).json({
        success: true,
        message: "Verification code sent to your email!",
        requireOtp: true,
        email: cleanEmail,
      });
    }

    // Step 2: Verify the provided OTP before creating user
    const cleanOtp = otp.toString().trim();
    const record = await Otp.findOne({ email: cleanEmail });
    if (!record || record.otp !== cleanOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code",
        result: null,
      });
    }

    // Remove used OTP
    await Otp.deleteOne({ _id: record._id });

    // Hash password & create user in MongoDB
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      dob: dob || null,
      age: age ? Number(age) : null,
    });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({
      success: true,
      message: "Account created and email verified! Welcome to EduHub",
      result: {
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          bio: user.bio,
          avatar: user.avatar,
          dob: user.dob,
          age: user.age,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      result: null,
    });
  }
});

// POST /api/auth/login — Step 1: Verify credentials & send OTP to email
router.route("/login").post(async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
        result: null,
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        result: null,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        result: null,
      });
    }

    // Direct Login: sign JWT and return user
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || "eduhub_super_secret_key_2024",
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful!",
      result: {
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          bio: user.bio,
          avatar: user.avatar,
          dob: user.dob,
          age: user.age,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      result: null,
    });
  }
});

// POST /api/auth/verify-otp — Step 2: Validate OTP and issue JWT
router.route("/verify-otp").post(async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and verification code are required",
        result: null,
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();

    const record = await Otp.findOne({ email: cleanEmail });
    if (!record || record.otp !== cleanOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code",
        result: null,
      });
    }

    // OTP is valid! Delete it so it cannot be reused
    await Otp.deleteOne({ _id: record._id });

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        result: null,
      });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });

    res.status(200).json({
      success: true,
      message: "Login verified successfully!",
      result: {
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          bio: user.bio,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      result: null,
    });
  }
});

// POST /api/auth/resend-otp — Resend a fresh OTP
router.route("/resend-otp").post(async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
        result: null,
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    const recipientName = user ? user.name : (name || "Student");

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.findOneAndUpdate(
      { email: cleanEmail },
      { otp, createdAt: new Date() },
      { upsert: true, new: true }
    );

    await sendOtpEmail(cleanEmail, otp, recipientName);

    res.status(200).json({
      success: true,
      message: "A fresh verification code has been sent!",
      result: null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      result: null,
    });
  }
});

module.exports = router;
