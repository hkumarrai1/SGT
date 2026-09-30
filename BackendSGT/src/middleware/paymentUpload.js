import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
      const error = new Error("Payment screenshot must be a JPG, PNG, or WebP image.");
      error.statusCode = 400;
      return callback(error);
    }
    return callback(null, true);
  },
});

export function receivePaymentScreenshot(req, res, next) {
  upload.single("screenshot")(req, res, (error) => {
    if (!error) return next();
    if (
      error instanceof multer.MulterError &&
      error.code === "LIMIT_FILE_SIZE"
    ) {
      error.statusCode = 413;
      error.message = "Payment screenshot must be 10 MB or smaller.";
    }
    return next(error);
  });
}
