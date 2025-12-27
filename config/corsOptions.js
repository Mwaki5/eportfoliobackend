const allowedDomain = require("../utils/allowedDomains");

const corsOption = {
  origin: (origin, callback) => {
    // allow requests with no origin (Postman, curl)
    if (!origin || allowedDomain.includes(origin)) {
      return callback(null, true);
    } else {
      // return false instead of an error to prevent crash
      return callback(new Error("Not allowed by CORS"));
    }
  },
  optionsSuccessStatus: 200,
};

module.exports = corsOption;
