const jwt = require("jsonwebtoken");
const { User } = require("../models");
const AppError = require("../utils/AppError");
const { generateAccessToken } = require("../utils/token");
const { audit, error } = require("../utils/logger");
const catchAsync = require("../utils/catchAsync");

const refreshToken = catchAsync(async (req, res, next) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) {
    error("REFRESH_TOKEN_MISSING", req, { message: "Cookies not found" });
    return next(new AppError("Refresh token missing", 401));
  }

  const refreshTokenFromCookie = cookies.jwt;

  try {
    const decoded = jwt.verify(
      refreshTokenFromCookie,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findOne({
      where: { userId: decoded.userInfor.userId },
    });
    if (!user) {
      error("USER_NOT_FOUND_REFRESH_TOKEN", req, {
        userId: decoded.userInfor.userId,
      });
      return next(new AppError("User not found", 401));
    }

    if (user.refreshToken !== refreshTokenFromCookie) {
      audit("REFRESH_TOKEN_MISMATCH", req, { userId: user.userId });
      return next(
        new AppError("Refresh token mismatch - please login again", 401)
      );
    }

    const accessToken = generateAccessToken({
      userId: user.userId,
      role: user.role,
    });
    audit("REFRESH_TOKEN_USED", req, { userId: user.userId });

    res.json({
      accessToken,
      user: {
        userId: user.userId,
        role: user.role,
        email: user.email,
        profilePic: user.profilePic,
        firstname: user.firstname,
        lastname: user.lastname,
      },
    });
  } catch (err) {
    error("INVALID_REFRESH_TOKEN", req, err);
    return next(new AppError("Invalid or expired refresh token", 401));
  }
});

module.exports = { refreshToken };
