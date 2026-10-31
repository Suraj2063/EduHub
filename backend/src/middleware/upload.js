const multer = require("multer");
const path = require("path");

// Memory storage keeps the uploaded file in memory as a Buffer (req.file.buffer).
// ZERO files are written to the local disk/computer!
const storage = multer.memoryStorage();

// File filter for documents & study materials
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /pdf|doc|docx|ppt|pptx|txt|png|jpg|jpeg|csv/;
  const extname = allowedExtensions.test(
    path.extname(file.originalname).toLowerCase()
  );
  if (extname) {
    return cb(null, true);
  }
  cb(
    new Error(
      "Unsupported file format! Allowed: PDF, DOC, DOCX, PPT, PPTX, TXT, PNG, JPG"
    )
  );
};

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB limit
  fileFilter,
});

module.exports = upload;
