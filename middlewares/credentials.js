const allowedDomain = require("../utils/allowedDomains");

const credentials = (req, res, next) => {
  const origin = req.headers.origin;

  if (!origin || allowedDomain.includes(origin)) {
    // Set credentials header for allowed origins
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Origin", origin);
    return next();
  } else {
    return res.status(403).json({ message: "Origin not allowed by CORS" });
  }
};

module.exports = credentials;
