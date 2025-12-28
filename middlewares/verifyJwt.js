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
    jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
      if (err) {
        return next(new AppError("Invalid token", 401));
      }
      req.userId = user.userInfor.userId;
      req.role = user.userInfor.role;

      next();
    });
    // MATCH YOUR TOKEN STRUCTURE
  } catch (err) {
    next(err);
  }
};

module.exports = { verifyJwt };
