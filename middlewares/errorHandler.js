const logger = require("../utils/logger");

module.exports = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  logger.error(err.code || "UNHANDLED_ERROR", req, err, {
    status_code: statusCode,
    service: "backend-api",
    retryable: false,
  });

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};
