const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
    },
    fileUrl: {
      type: String,
      required: false,
      default: "",
    },
    filePath: {
      type: String,
      required: false,
      default: "",
    },
    fileName: {
      type: String,
      required: false,
      default: "",
    },
    fileSize: {
      type: Number,
      required: false,
      default: 0,
    },
    fileType: {
      type: String,
      required: false,
      default: "",
    },
    cloudinaryPublicId: {
      type: String,
      required: false,
      default: "",
    },
    isCloudinary: {
      type: Boolean,
      default: false,
    },
    extractedText: {
      type: String,
      required: false,
      default: "",
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Uploader is required"],
    },
  },
  { timestamps: true }
);

resourceSchema.pre("validate", function () {
  if (!this.filePath && !this.fileUrl && !this.fileName) {
    this.invalidate("file", "A study note document file is compulsory");
  }
});

const Resource = mongoose.model("Resource", resourceSchema);

module.exports = Resource;
