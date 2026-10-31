const cloudinary = require("cloudinary").v2;
const path = require("path");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME
    ? process.env.CLOUDINARY_CLOUD_NAME.trim()
    : "",
  api_key: process.env.CLOUDINARY_API_KEY
    ? process.env.CLOUDINARY_API_KEY.trim()
    : "",
  api_secret: process.env.CLOUDINARY_API_SECRET
    ? process.env.CLOUDINARY_API_SECRET.trim()
    : "",
});

/**
 * Uploads a file buffer directly from memory to Cloudinary
 * Zero bytes written to local computer disk.
 */
const uploadStreamToCloudinary = (
  buffer,
  originalname,
  folder = "eduhub_notes"
) => {
  return new Promise((resolve, reject) => {
    const ext = path.extname(originalname).toLowerCase();
    const baseName = path.basename(originalname, ext);
    const cleanName = baseName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueId = `${Date.now()}-${cleanName}`;

    // PDFs MUST use 'raw' — uploading as 'auto'/'image' causes Cloudinary to
    // process the PDF as an image, stripping the text layer entirely.
    // pdf-parse then gets 0 chars. Raw type preserves the exact original binary.
    const isRawDoc = /^\.(docx?|pptx?|xlsx?|csv|txt|pdf)$/i.test(ext);
    const resourceType = isRawDoc ? "raw" : "auto";

    const options = {
      folder,
      resource_type: resourceType,
      public_id: `${uniqueId}${ext}`,
    };

    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        return reject(error);
      }
      resolve(result);
    });

    stream.end(buffer);
  });
};

/**
 * Deletes a file from Cloudinary using its public_id
 */
const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    // Try raw first (PDFs, docs), then image (photos, etc.)
    const rawRes = await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
    if (rawRes.result !== "ok") {
      await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
    }
  } catch (err) {
    console.error("Cloudinary deletion failed:", err.message);
  }
};

module.exports = {
  cloudinary,
  uploadStreamToCloudinary,
  deleteFromCloudinary,
};
