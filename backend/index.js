require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectToDb = require("./src/connectToDb");
const authRoutes = require("./src/routes/authRoutes");
const { router: userRoutes } = require("./src/routes/userRoutes");
const resourceRoutes = require("./src/routes/resourceRoutes");
const quizRoutes = require("./src/routes/quizRoutes");
const audioRoutes = require("./src/routes/audioRoutes");
const videoRoutes = require("./src/routes/videoRoutes");

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
const allowedOrigin = process.env.CLIENT_URL || "*";
app.use(cors({ origin: allowedOrigin === "*" ? true : allowedOrigin, credentials: true }));
app.use(express.json());

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Connect to MongoDB
connectToDb();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/audio", audioRoutes);
app.use("/api/video", videoRoutes);

// Root health check
app.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "EduHub API is running", result: null });
});

app.listen(PORT, () => {
  console.log(`[EduHub] Server running on http://localhost:${PORT}`);
});
