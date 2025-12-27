const AppError = require("../utils/AppError");
const { generateAccessToken } = require("../utils/token");
const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { audit, error } = require("../utils/logger");

const refreshToken = async (req, res, next) => {
  const cookies = req.cookies;

  if (!cookies?.jwt) {
    error("REFRESH_TOKEN_MISSING", req, { message: "Cookies not found" });
    return next(new AppError("Cookies not found", 401));
  }

  const refreshTokenFromCookie = cookies.jwt;

  try {
    // Verify JWT signature
    const decoded = jwt.verify(
      refreshTokenFromCookie,
      process.env.REFRESH_TOKEN_SECRET
    );

    // Find user and verify refresh token
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

    // Generate new access token
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
    if (err.name === "TokenExpiredError" || err.name === "JsonWebTokenError") {
      error("INVALID_OR_EXPIRED_REFRESH_TOKEN", req, { error: err });
      return next(new AppError("Invalid or expired refresh token", 401));
    }

    error("UNEXPECTED_REFRESH_TOKEN_ERROR", req, { error: err });
    return next(err);
  }
};

module.exports = { refreshToken };
