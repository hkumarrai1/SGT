import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    if (!file.mimetype.startsWith("image/")) {
      const error = new Error(
        "Live Photo must be an image captured by the camera.",
      );
      error.statusCode = 400;
      return callback(error);
    }
    return callback(null, true);
  },
});

export function receiveLivePhoto(req, res, next) {
  upload.single("photo")(req, res, (error) => {
    if (!error) return next();
    if (
      error instanceof multer.MulterError &&
      error.code === "LIMIT_FILE_SIZE"
    ) {
      error.statusCode = 413;
      error.message = "Live Photo must be 5 MB or smaller.";
    }
    return next(error);
  });
}
