const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const { generateAccessToken, generateRefreshToken } = require("../utils/token");
const { User } = require("../models");
const AppError = require("../utils/AppError");
const { audit, error } = require("../utils/logger");
const { validateAndSaveFile } = require("../services/fileHandler");

// ===== REGISTER USER =====
const registerUser = async (req, res, next) => {
  try {
    const {
      userId,
      email,
      gender,
      firstname,
      level,
      lastname,
      role,
      department,
    } = req.body;

    // Check if userId or email exists
    const existing = await User.findOne({
      where: { [Op.or]: [{ userId }, { email }] },
    });
    if (existing) throw new AppError("UserId or email already exists", 400);

    if (!req.file) throw new AppError("Profile image required", 400);

    // Hash password
    const hashedPassword = await bcrypt.hash(userId, 10);

    // Validate and save profile picture
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

    // Audit log (user registration)
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
  } catch (err) {
    // Error log
    error("REGISTER_USER_ERROR", req, err);
    next(err);
  }
};

// ===== LOGIN USER =====
const loginUser = async (req, res, next) => {
  try {
    const { userId, password } = req.body;

    const user = await User.findOne({ where: { userId } });
    if (!user) {
      audit("USER_LOGIN", req, {
        result: "FAILURE",
        failure_reason: "Invalid credentials",
      });
      throw new AppError("Invalid credentials", 400);
    }

    // Optionally compare password
    // const isMatch = await bcrypt.compare(password, user.password);
    // if (!isMatch) {
    //   audit("USER_LOGIN", req, { result: "FAILURE", failure_reason: "Invalid credentials" });
    //   throw new AppError("Invalid credentials", 400);
    // }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.userId,
      role: user.role,
    });
    const refreshToken = generateRefreshToken({
      userId: user.userId,
      role: user.role,
    });

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    // Set cookie
    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Audit log (login success)
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
        profilePic: user.profilePic,
      },
    });
  } catch (err) {
    error("LOGIN_USER_ERROR", req, err);
    next(err);
  }
};

// ===== LOGOUT USER =====
const logoutUser = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.jwt;

    if (!refreshToken) return res.sendStatus(204);

    const user = await User.findOne({ where: { refreshToken } });

    if (user) {
      user.refreshToken = null;
      await user.save();

      // Audit log (logout)
      audit("USER_LOGOUT", req, {
        resource_type: "User",
        resource_id: user.userId,
        result: "SUCCESS",
      });
    }

    // Clear cookie
    res.clearCookie("jwt", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    res.sendStatus(204);
  } catch (err) {
    error("LOGOUT_USER_ERROR", req, err);
    next(err);
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
};
