const jwt = require("jsonwebtoken");
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userInfor: {
        userId: user.userId,
        role: user.role,
      },
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      userInfor: {
        userId: user.userId,
        role: user.role,
      },
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES }
  );
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
};
