const Media = require("../models/Media");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

// Upload media
const uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const { filename, originalname, mimetype, size, path: filePath } = req.file;
    let type = "other";
    let dimensions = {};
    let processedPath = filePath;
    let processedFilename = filename;

    // Determine type
    if (mimetype.startsWith("image/")) {
      type = "image";
      // Process image with sharp
      try {
        const metadata = await sharp(filePath).metadata();
        dimensions = { width: metadata.width, height: metadata.height };

        // If image is large, resize it
        if (metadata.width > 1920) {
          const resizedFilename = "resized-" + filename;
          const resizedPath = path.join(
            path.dirname(filePath),
            resizedFilename,
          );

          await sharp(filePath)
            .resize(1920, null, { withoutEnlargement: true })
            .toFile(resizedPath);

          // Delete original large file and update path
          fs.unlinkSync(filePath);
          processedPath = resizedPath;
          processedFilename = resizedFilename;

          // Update dimensions
          const newMetadata = await sharp(processedPath).metadata();
          dimensions = { width: newMetadata.width, height: newMetadata.height };
        }
      } catch (err) {
        console.error("Error processing image with sharp:", err);
      }
    } else if (mimetype.startsWith("video/")) {
      type = "video";
    } else if (mimetype === "application/pdf") {
      type = "pdf";
    }

    const media = new Media({
      filename: processedFilename,
      originalName: originalname,
      mimeType: mimetype,
      size: size, // Note: Size might change if resized, but keeping original size for now or could update
      path: processedPath,
      url: "/uploads/" + processedFilename,
      type,
      dimensions,
      uploadedBy: req.userId,
    });

    await media.save();

    res.status(201).json({
      success: true,
      message: "File uploaded successfully",
      media,
    });
  } catch (error) {
    console.error("Upload media error:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading media",
      error: error.message,
    });
  }
};

// Get all media (with pagination)
const getAllMedia = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const type = req.query.type;

    const query = { uploadedBy: req.userId };
    if (type) {
      query.type = type;
    }

    const media = await Media.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Media.countDocuments(query);

    res.json({
      success: true,
      media,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get all media error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching media",
      error: error.message,
    });
  }
};

// Update media details (Alt text)
const updateMedia = async (req, res) => {
  try {
    const { altText } = req.body;
    const media = await Media.findOne({
      _id: req.params.id,
      uploadedBy: req.userId,
    });

    if (!media) {
      return res.status(404).json({
        success: false,
        message: "Media not found",
      });
    }

    if (altText !== undefined) {
      media.altText = altText;
    }

    await media.save();

    res.json({
      success: true,
      message: "Media updated successfully",
      media,
    });
  } catch (error) {
    console.error("Update media error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating media",
      error: error.message,
    });
  }
};

// Delete media
const deleteMedia = async (req, res) => {
  try {
    const media = await Media.findOne({
      _id: req.params.id,
      uploadedBy: req.userId,
    });

    if (!media) {
      return res.status(404).json({
        success: false,
        message: "Media not found",
      });
    }

    // Delete file from filesystem
    if (fs.existsSync(media.path)) {
      fs.unlinkSync(media.path);
    }

    await media.deleteOne();

    res.json({
      success: true,
      message: "Media deleted successfully",
    });
  } catch (error) {
    console.error("Delete media error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting media",
      error: error.message,
    });
  }
};

module.exports = {
  uploadMedia,
  getAllMedia,
  updateMedia,
  deleteMedia,
};
