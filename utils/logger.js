const { createLogger, format, transports } = require("winston");
require("winston-daily-rotate-file");
const path = require("path");
const fs = require("fs");

/* --------------------------------------------------
   Ensure log directories exist
-------------------------------------------------- */
["app", "audit", "error"].forEach((folder) => {
  const dir = path.join(__dirname, "../logs", folder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/* --------------------------------------------------
   Safe JSON formatter (prevents circular refs)
-------------------------------------------------- */
const safeJson = format((info) => {
  try {
    JSON.stringify(info);
    return info;
  } catch {
    info.meta = "[UNSERIALIZABLE_METADATA]";
    return info;
  }
});

/* --------------------------------------------------
   Base JSON format
-------------------------------------------------- */
const baseFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DDTHH:mm:ss.SSSZ" }),
  safeJson(),
  format.json()
);

/* --------------------------------------------------
   Transport factory
-------------------------------------------------- */
const rotate = (folder, level, retention) =>
  new transports.DailyRotateFile({
    filename: path.join(__dirname, "../logs", folder, "%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    maxSize: "20m",
    maxFiles: retention,
    zippedArchive: true,
    level,
    format: baseFormat,
  });

/* --------------------------------------------------
   Loggers
-------------------------------------------------- */
const appLogger = createLogger({
  level: "info",
  transports: [rotate("app", "info", "14d")],
});

const auditLogger = createLogger({
  level: "info",
  transports: [rotate("audit", "info", "365d")],
});

const errorLogger = createLogger({
  level: "error",
  transports: [rotate("error", "error", "90d")],
});

/* --------------------------------------------------
   Context extractors (strict, minimal)
-------------------------------------------------- */

// ERROR context
const extractErrorContext = (req, err) => ({
  request_id: req?.requestId ?? null,
  user_id: req?.userId ?? null,
  http_method: req?.method ?? null,
  endpoint: req?.originalUrl ?? null,
  ip_address: req?.ip ?? null,
  error_message: err?.message ?? null,
  stack_trace:
    process.env.NODE_ENV !== "production" ? err?.stack ?? null : null,
});

// AUDIT context
const extractAuditContext = (req) => ({
  request_id: req?.requestId ?? null,
  actor_id: req?.userId ?? null,
  actor_role: req?.role ?? null,
  ip_address: req?.ip ?? null,
  user_agent: req?.headers?.["user-agent"] ?? null,
});

/* --------------------------------------------------
   Public logging API
-------------------------------------------------- */
module.exports = {
  // Application logs (behavior/performance)
  app: (event, req, extra = {}) =>
    appLogger.info({
      event,
      request_id: req?.requestId ?? null,
      user_id: req?.userId ?? null,
      latency_ms: req?.latency_ms ?? null,
      ...extra,
    }),

  // Audit logs (security/accountability)
  audit: (action, req, extra = {}) =>
    auditLogger.info({
      action,
      ...extractAuditContext(req),
      ...extra,
    }),

  // Error logs (failures & recovery)
  error: (error_code, req, err, extra = {}) =>
    errorLogger.error({
      severity: "ERROR",
      error_code,
      error_type: err?.name ?? "ApplicationError",
      retryable: false,
      ...extractErrorContext(req, err),
      ...extra,
    }),
};
