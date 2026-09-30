export function notFound(req, res) {
  res.status(404).json({ success: false, message: "Route not found." });
}

export function errorHandler(error, req, res, next) {
  console.error(error?.message || error);
  const statusCode = error.statusCode || 500;
  const response = {
    success: false,
    message: statusCode === 500 ? "Something went wrong." : error.message,
  };

  if (error.retryAfterSeconds)
    response.retryAfterSeconds = error.retryAfterSeconds;
  res.status(statusCode).json(response);
}
