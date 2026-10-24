export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const isInvalidJson = err.type === "entity.parse.failed";

  const statusCode = isInvalidJson
    ? 400
    : Number.isInteger(err.statusCode)
      ? err.statusCode
      : 500;

  if (statusCode >= 500) {
    console.error(err);
  }

  const message = isInvalidJson
    ? "Invalid JSON request body"
    : statusCode >= 500
      ? "Internal server error"
      : err.message;

  return res.status(statusCode).json({
    error: message
  });
}