const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    otp: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      // Automatically removes document from MongoDB after 300 seconds (5 minutes)
      expires: 300,
    },
  },
  { timestamps: false }
);

// Compound index on email
otpSchema.index({ email: 1 });

const Otp = mongoose.model("Otp", otpSchema);

module.exports = Otp;
