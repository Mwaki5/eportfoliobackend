import rateLimit from "express-rate-limit";
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests please try again later.",
  keyGenerator: (req) => {
    return req.userId || req.ip;
  },
  skip: (req) =>
    req.ip === "::1" ||
    req.ip === "127.0.0.1" ||
    req.ip.startsWith("::ffff:127."),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many attempts, try again later.",
  skip: (req) =>
    req.ip === "::1" ||
    req.ip === "127.0.0.1" ||
    req.ip.startsWith("::ffff:127."),
});

export { apiLimiter, authLimiter };
