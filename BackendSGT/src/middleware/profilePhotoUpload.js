import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    if (!file.mimetype.startsWith("image/")) {
      const error = new Error("Only image files are allowed.");
      error.statusCode = 400;
      return callback(error);
    }
    return callback(null, true);
  },
});

export function receiveProfilePhoto(req, res, next) {
  upload.single("photo")(req, res, (error) => {
    if (!error) return next();
    if (
      error instanceof multer.MulterError &&
      error.code === "LIMIT_FILE_SIZE"
    ) {
      error.statusCode = 413;
      error.message = "Profile photo must be 5 MB or smaller.";
    }
    return next(error);
  });
}
