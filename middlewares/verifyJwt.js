const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");

const verifyJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log(req.file);
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Wrongly formatted header", 401));
  }

  const accessToken = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    // MATCH YOUR TOKEN STRUCTURE
    req.userId = decoded.userInfor.userId;
    req.role = decoded.userInfor.role;

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { verifyJwt };
