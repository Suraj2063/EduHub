const mongoose = require("mongoose");

const connectToDb = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/eduhub";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};

module.exports = connectToDb;
