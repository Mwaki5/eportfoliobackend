const { User } = require("../models");
const { Op } = require("sequelize");
const AppError = require("../utils/AppError");
const { validateAndSaveFile } = require("../services/fileHandler");
const { app, audit, error } = require("../utils/logger");

// Helper
const isValid = (val) => val && val !== "undefined" && val.trim() !== "";

// ===== GET ALL STUDENTS =====
const getAllStudents = async (req, res, next) => {
  try {
    const students = await User.findAll({
      where: { role: "student" },
      attributes: { exclude: ["password", "refreshToken"] },
      order: [["createdAt", "DESC"]],
    });

    app("FETCH_ALL_STUDENTS", req, { count: students.length });
    res.status(200).json({ success: true, data: students });
  } catch (err) {
    error("FETCH_ALL_STUDENTS_ERROR", req, { error: err });
    next(err);
  }
};

// ===== FILTER STUDENTS =====
const filterStudents = async (req, res, next) => {
  try {
    const { department, level, gender } = req.query;
    let whereClause = { role: "student" };

    if (isValid(department))
      whereClause.department = { [Op.like]: `%${department}%` };
    if (isValid(level)) whereClause.level = level;
    if (isValid(gender)) whereClause.gender = gender;

    const students = await User.findAll({
      where: whereClause,
      attributes: { exclude: ["password", "refreshToken"] },
      order: [["createdAt", "DESC"]],
      limit: 100,
    });

    audit("FILTER_STUDENTS", req, {
      filters: req.query,
      count: students.length,
    });
    res
      .status(200)
      .json({ success: true, count: students.length, data: students });
  } catch (err) {
    error("FILTER_STUDENTS_ERROR", req, { error: err });
    next(err);
  }
};

// ===== GET STUDENT BY ID =====
const getStudentById = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const student = await User.findOne({
      where: { userId: studentId, role: "student" },
      attributes: { exclude: ["password", "refreshToken"] },
    });

    if (!student) {
      audit("STUDENT_NOT_FOUND", req, { studentId });
      return next(new AppError("Student not found", 404));
    }

    res.status(200).json({ success: true, data: student });
  } catch (err) {
    error("GET_STUDENT_BY_ID_ERROR", req, { error: err });
    next(err);
  }
};

// ===== SEARCH STUDENTS =====
const searchStudents = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    if (!identifier)
      return next(new AppError("Search identifier is required", 400));

    const students = await User.findAll({
      where: {
        role: "student",
        [Op.or]: [
          { userId: { [Op.like]: `%${identifier}%` } },
          { email: { [Op.like]: `%${identifier}%` } },
        ],
      },
      attributes: { exclude: ["password", "refreshToken"] },
      limit: 50,
    });

    audit("SEARCH_STUDENTS", req, { identifier, count: students.length });
    res.status(200).json({ success: true, data: students });
  } catch (err) {
    error("SEARCH_STUDENTS_ERROR", req, { error: err });
    next(err);
  }
};

// ===== UPDATE STUDENT =====
const updateStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { userId, email, firstname, lastname, gender, department, level } =
      req.body;

    const student = await User.findOne({
      where: { userId: studentId, role: "student" },
    });
    if (!student) return next(new AppError("Student not found", 404));

    // Update profile picture
    if (req.file) {
      const profilePicPath = await validateAndSaveFile(req.file, "profilePic", {
        allowedTypes: ["image/jpeg", "image/png", "image/webp"],
        maxSize: 2 * 1024 * 1024,
      });
      student.profilePic = profilePicPath
        .replace(/\\/g, "/")
        .replace("public/", "");
    }

    // Update other fields
    if (userId) student.userId = userId;
    if (email) student.email = email;
    if (firstname) student.firstname = firstname;
    if (lastname) student.lastname = lastname;
    if (gender) student.gender = gender;
    if (department) student.department = department;
    if (level) student.level = level;

    await student.save();

    const studentData = student.toJSON();
    delete studentData.password;
    delete studentData.refreshToken;

    audit("UPDATE_STUDENT", req, { studentId });
    res.status(200).json({
      success: true,
      message: "Student updated successfully",
      data: studentData,
    });
  } catch (err) {
    error("UPDATE_STUDENT_ERROR", req, { error: err });
    next(err);
  }
};

// ===== DELETE STUDENT =====
const deleteStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const student = await User.findOne({
      where: { userId: studentId, role: "student" },
    });

    if (!student) return next(new AppError("Student not found", 404));

    await student.destroy();
    audit("DELETE_STUDENT", req, { studentId });

    res
      .status(200)
      .json({ success: true, message: "Student deleted successfully" });
  } catch (err) {
    error("DELETE_STUDENT_ERROR", req, { error: err });
    next(err);
  }
};

module.exports = {
  getAllStudents,
  getStudentById,
  filterStudents,
  searchStudents,
  updateStudent,
  deleteStudent,
};
