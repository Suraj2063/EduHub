const express = require("express");
const Resource = require("../schema/resourceSchema");
const { verifyToken } = require("../middleware/auth");
const upload = require("../middleware/upload");
const {
  uploadStreamToCloudinary,
  deleteFromCloudinary,
} = require("../config/cloudinary");

const router = express.Router();

// GET /api/resources  — get all (with optional ?subject= and ?search= query params)
// POST /api/resources — create new resource directly in Cloudinary (auth required)
router
  .route("/")
  .get(async (req, res) => {
    try {
      const { subject, search } = req.query;
      let filter = {};
      if (subject) filter.subject = { $regex: subject, $options: "i" };
      if (search) filter.title = { $regex: search, $options: "i" };

      const resources = await Resource.find(filter)
        .populate("uploadedBy", "name email avatar")
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        message: "Resources fetched successfully",
        result: resources,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message, result: null });
    }
  })
  .post(
    verifyToken,
    (req, res, next) => {
      upload.single("file")(req, res, function (err) {
        if (err) {
          return res.status(400).json({
            success: false,
            message: err.message,
            result: null,
          });
        }
        next();
      });
    },
    async (req, res) => {
      try {
        const { title, description, subject, fileUrl } = req.body;

        if (!title || !description || !subject) {
          return res.status(400).json({
            success: false,
            message: "Title, description, and subject are required",
            result: null,
          });
        }

        // File upload is compulsory
        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: "Uploading a study note document (PDF, DOCX, TXT, etc.) is compulsory",
            result: null,
          });
        }

        let finalFileUrl = fileUrl ? fileUrl.trim() : "";
        let cloudinaryPublicId = "";
        let fileName = "";
        let fileSize = 0;
        let fileType = "";
        let isCloudinary = false;

        // If file was uploaded in memory, stream directly to Cloudinary (zero bytes to local disk)
        if (req.file) {
          if (
            !process.env.CLOUDINARY_CLOUD_NAME ||
            !process.env.CLOUDINARY_API_KEY ||
            !process.env.CLOUDINARY_API_SECRET
          ) {
            return res.status(500).json({
              success: false,
              message:
                "Cloudinary credentials missing! Please configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend/.env",
              result: null,
            });
          }

          const uploadResult = await uploadStreamToCloudinary(
            req.file.buffer,
            req.file.originalname
          );

          finalFileUrl = uploadResult.secure_url;
          cloudinaryPublicId = uploadResult.public_id;
          fileName = req.file.originalname;
          fileSize = req.file.size;
          fileType = req.file.mimetype;
          isCloudinary = true;
        }

        const resource = await Resource.create({
          title: title.trim(),
          description: description.trim(),
          subject: subject.trim(),
          fileUrl: finalFileUrl,
          cloudinaryPublicId,
          fileName,
          fileSize,
          fileType,
          isCloudinary,
          uploadedBy: req.userId,
        });

        const populated = await resource.populate("uploadedBy", "name email avatar");
        res.status(201).json({
          success: true,
          message: "Resource uploaded successfully",
          result: populated,
        });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message, result: null });
      }
    }
  );

// GET /api/resources/:id   — get one
// PATCH /api/resources/:id — update (auth + owner only, with optional new file)
// DELETE /api/resources/:id — delete (auth + owner only, cleans up Cloudinary)
router
  .route("/:id")
  .get(async (req, res) => {
    try {
      const resource = await Resource.findById(req.params.id).populate(
        "uploadedBy",
        "name email bio avatar"
      );
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: "Resource not found",
          result: null,
        });
      }
      res.status(200).json({
        success: true,
        message: "Resource fetched successfully",
        result: resource,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message, result: null });
    }
  })
  .patch(
    verifyToken,
    (req, res, next) => {
      upload.single("file")(req, res, function (err) {
        if (err) {
          return res.status(400).json({
            success: false,
            message: err.message,
            result: null,
          });
        }
        next();
      });
    },
    async (req, res) => {
      try {
        const resource = await Resource.findById(req.params.id);
        if (!resource) {
          return res.status(404).json({ success: false, message: "Resource not found", result: null });
        }
        if (resource.uploadedBy.toString() !== req.userId) {
          return res.status(403).json({
            success: false,
            message: "You are not authorized to edit this resource",
            result: null,
          });
        }

        const updateData = { ...req.body };

        // If a new file was uploaded, stream to Cloudinary & remove old file from Cloudinary
        if (req.file) {
          if (
            !process.env.CLOUDINARY_CLOUD_NAME ||
            !process.env.CLOUDINARY_API_KEY ||
            !process.env.CLOUDINARY_API_SECRET
          ) {
            return res.status(500).json({
              success: false,
              message:
                "Cloudinary credentials missing in backend/.env!",
              result: null,
            });
          }

          if (resource.cloudinaryPublicId) {
            await deleteFromCloudinary(resource.cloudinaryPublicId);
          }

          const uploadResult = await uploadStreamToCloudinary(
            req.file.buffer,
            req.file.originalname
          );

          updateData.fileUrl = uploadResult.secure_url;
          updateData.cloudinaryPublicId = uploadResult.public_id;
          updateData.fileName = req.file.originalname;
          updateData.fileSize = req.file.size;
          updateData.fileType = req.file.mimetype;
          updateData.isCloudinary = true;
        }

        const finalFileUrl =
          updateData.fileUrl !== undefined ? updateData.fileUrl : resource.fileUrl;

        if (!finalFileUrl) {
          return res.status(400).json({
            success: false,
            message: "Resource must have either an uploaded file or an external link",
            result: null,
          });
        }

        const updated = await Resource.findByIdAndUpdate(req.params.id, updateData, {
          new: true,
        }).populate("uploadedBy", "name email avatar");

        res.status(200).json({
          success: true,
          message: "Resource updated successfully",
          result: updated,
        });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message, result: null });
      }
    }
  )
  .delete(verifyToken, async (req, res) => {
    try {
      const resource = await Resource.findById(req.params.id);
      if (!resource) {
        return res.status(404).json({ success: false, message: "Resource not found", result: null });
      }
      if (resource.uploadedBy.toString() !== req.userId) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to delete this resource",
          result: null,
        });
      }

      // Delete file from Cloudinary if it was stored there
      if (resource.cloudinaryPublicId) {
        await deleteFromCloudinary(resource.cloudinaryPublicId);
      }

      await Resource.findByIdAndDelete(req.params.id);
      res.status(200).json({
        success: true,
        message: "Resource deleted from database and Cloudinary successfully",
        result: null,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message, result: null });
    }
  });

// GET /api/resources/user/:userId  — get all resources by a specific user
router.route("/user/:userId").get(async (req, res) => {
  try {
    const resources = await Resource.find({ uploadedBy: req.params.userId })
      .populate("uploadedBy", "name email avatar")
      .sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: "User resources fetched successfully",
      result: resources,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, result: null });
  }
});

module.exports = router;
