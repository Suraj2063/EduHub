const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const User = require("../schema/userSchema");
const {
  uploadStreamToCloudinary,
  deleteFromCloudinary,
} = require("../config/cloudinary");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "eduhub_super_secret_key_2024";

// Multer — memory storage for Cloudinary streaming (max 5 MB avatar)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (JPEG, PNG, WebP) are allowed"), false);
    }
  },
});

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access denied. No token provided.",
      result: null,
    });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      result: null,
    });
  }
};

// GET /api/users/me  — get logged-in user
router.route("/me").get(verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        result: null,
      });
    }
    res.status(200).json({
      success: true,
      message: "User fetched successfully",
      result: user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, result: null });
  }
});

// PATCH /api/users/me  — update profile (name, bio, dob, age, and optional avatar)
router.route("/me").patch(
  verifyToken,
  upload.single("avatar"),
  async (req, res) => {
    try {
      const { name, bio, dob, age } = req.body;
      const updateData = {};

      if (name !== undefined) updateData.name = name;
      if (bio !== undefined) updateData.bio = bio;
      if (dob !== undefined) updateData.dob = dob || null;
      if (age !== undefined) updateData.age = age ? Number(age) : null;

      // Handle avatar upload to Cloudinary
      if (req.file) {
        if (
          !process.env.CLOUDINARY_CLOUD_NAME ||
          !process.env.CLOUDINARY_API_KEY ||
          !process.env.CLOUDINARY_API_SECRET
        ) {
          return res.status(500).json({
            success: false,
            message: "Cloudinary credentials not configured",
            result: null,
          });
        }

        // Delete old avatar from Cloudinary if exists
        const existingUser = await User.findById(req.userId);
        if (existingUser && existingUser.avatarPublicId) {
          await deleteFromCloudinary(existingUser.avatarPublicId);
        }

        const uploadResult = await uploadStreamToCloudinary(
          req.file.buffer,
          req.file.originalname,
          "eduhub_avatars"
        );

        updateData.avatar = uploadResult.secure_url;
        updateData.avatarPublicId = uploadResult.public_id;
      }

      const updated = await User.findByIdAndUpdate(
        req.userId,
        updateData,
        { new: true }
      ).select("-password");

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        result: updated,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message, result: null });
    }
  }
);

// PATCH /api/users/change-password
router.route("/change-password").patch(verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found", result: null });
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
        result: null,
      });
    }

    const { validatePassword } = require("../utils/validators");
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message,
        result: null,
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(req.userId, { password: hashedPassword }, { new: true });
    res.status(200).json({
      success: true,
      message: "Password changed successfully",
      result: null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, result: null });
  }
});

// DELETE /api/users/me  — delete account
router.route("/me/delete").delete(verifyToken, async (req, res) => {
  try {
    // Delete avatar from Cloudinary before deleting user
    const user = await User.findById(req.userId);
    if (user && user.avatarPublicId) {
      await deleteFromCloudinary(user.avatarPublicId);
    }

    await User.findByIdAndDelete(req.userId);
    res.status(200).json({
      success: true,
      message: "Account deleted successfully",
      result: null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, result: null });
  }
});

module.exports = { router, verifyToken };
