const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const { generateAccessToken, generateRefreshToken } = require("../utils/token");
const { User } = require("../models");
const AppError = require("../utils/AppError");
const { audit, error } = require("../utils/logger");
const { validateAndSaveFile } = require("../services/fileHandler");
const catchAsync = require("../utils/catchAsync");

// ===== REGISTER USER =====
const registerUser = catchAsync(async (req, res, next) => {
  const {
    userId,
    email,
    gender,
    firstname,
    lastname,
    level,
    role,
    department,
  } = req.body;

  const existing = await User.findOne({
    where: { [Op.or]: [{ userId }, { email }] },
  });
  if (existing)
    return next(new AppError("UserId or email already exists", 400));
  if (!req.file) return next(new AppError("Profile image required", 400));

  const hashedPassword = await bcrypt.hash(userId, 10);
  const profilePicPath = await validateAndSaveFile(req.file, "profilePic", {
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    maxSize: 2 * 1024 * 1024,
  });
  const filepath = profilePicPath.replace(/\\/g, "/").replace("public/", "");

  const user = await User.create({
    userId,
    email,
    password: hashedPassword,
    firstname,
    lastname,
    gender,
    department,
    level: level || null,
    role,
    profilePic: filepath,
  });

  audit("CREATE_USER", req, {
    resource_type: "User",
    resource_id: user.userId,
    result: "SUCCESS",
  });

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: { userId, email, role },
  });
});

// ===== LOGIN USER =====
const loginUser = catchAsync(async (req, res, next) => {
  const { userId, password } = req.body;
  const user = await User.findOne({ where: { userId } });

  if (!user) {
    audit("USER_LOGIN", req, {
      result: "FAILURE",
      failure_reason: "Invalid credentials",
    });
    return next(new AppError("Invalid credentials", 400));
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    audit("USER_LOGIN", req, {
      result: "FAILURE",
      failure_reason: "Invalid credentials",
    });
    return next(new AppError("Invalid credentials", 400));
  }

  const accessToken = generateAccessToken({
    userId: user.userId,
    role: user.role,
  });
  const refreshToken = generateRefreshToken({
    userId: user.userId,
    role: user.role,
  });

  user.refreshToken = refreshToken;
  await user.save();

  res.cookie("jwt", refreshToken, {
    httpOnly: true,
    // secure: process.env.NODE_ENV === "production",
    secure: true,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  audit("USER_LOGIN", req, {
    resource_type: "User",
    resource_id: user.userId,
    result: "SUCCESS",
  });

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      accessToken,
      userId: user.userId,
      id: user.id,
      role: user.role,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      profilePic: user.profilePic,
    },
  });
});

// ===== LOGOUT USER =====
const logoutUser = catchAsync(async (req, res, next) => {
  const refreshToken = req.cookies?.jwt;
  if (!refreshToken) return res.sendStatus(204);

  const user = await User.findOne({ where: { refreshToken } });
  if (user) {
    user.refreshToken = null;
    await user.save();
    audit("USER_LOGOUT", req, {
      resource_type: "User",
      resource_id: user.userId,
      result: "SUCCESS",
    });
  }

  res.clearCookie("jwt", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
  res.sendStatus(204);
});

module.exports = { registerUser, loginUser, logoutUser };
