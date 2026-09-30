import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    if (!/^image\/(jpeg|png)$/.test(file.mimetype)) {
      const error = new Error("College ID must be a JPG, JPEG, or PNG image.");
      error.statusCode = 400;
      return callback(error);
    }
    return callback(null, true);
  },
});

export function receiveCollegeId(req, res, next) {
  upload.single("document")(req, res, (error) => {
    if (!error) return next();
    if (
      error instanceof multer.MulterError &&
      error.code === "LIMIT_FILE_SIZE"
    ) {
      error.statusCode = 413;
      error.message = "College ID must be 10 MB or smaller.";
    }
    return next(error);
  });
}
