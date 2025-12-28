const { error } = require("../utils/logger");

// Global Error Handler
const globalErrorHandler = (err, req, res, next) => {
  // Log all errors for debugging
  error("GLOBAL_ERROR", req, err, { error: err });
  console.log(err);
  // If error is operational (AppError)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
    });
  }

  // For non-operational errors (programming, DB, unknown)
  // Do not send sensitive details to client
  res.status(500).json({
    success: false,
    status: "error",
    message: "Something went wrong on the server",
  });
};

module.exports = globalErrorHandler;
