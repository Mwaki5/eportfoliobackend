const { User } = require("../models");
const { Op } = require("sequelize");
const AppError = require("../utils/AppError");
const { validateAndSaveFile } = require("../services/fileHandler");
const { app, audit, error } = require("../utils/logger");
const catchAsync = require("../utils/catchAsync");

const isValid = (val) => val && val !== "undefined" && val.trim() !== "";

// GET ALL STUDENTS
const getAllStudents = catchAsync(async (req, res) => {
  const students = await User.findAll({
    where: { role: "student" },
    attributes: { exclude: ["password", "refreshToken"] },
    order: [["createdAt", "DESC"]],
  });

  app("FETCH_ALL_STUDENTS", req, { count: students.length });
  res.status(200).json({ success: true, data: students });
});

// FILTER STUDENTS
const filterStudents = catchAsync(async (req, res) => {
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

  audit("FILTER_STUDENTS", req, { filters: req.query, count: students.length });
  res
    .status(200)
    .json({ success: true, count: students.length, data: students });
});

// GET STUDENT BY ID
const getStudentById = catchAsync(async (req, res, next) => {
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
});

// SEARCH STUDENTS
const searchStudents = catchAsync(async (req, res, next) => {
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
});

// UPDATE STUDENT
const updateStudent = catchAsync(async (req, res, next) => {
  const { studentId } = req.params;
  const { userId, email, firstname, lastname, gender, department, level } =
    req.body;

  const student = await User.findOne({
    where: { userId: studentId, role: "student" },
  });
  if (!student) return next(new AppError("Student not found", 404));

  if (req.file) {
    const profilePicPath = await validateAndSaveFile(req.file, "profilePic", {
      allowedTypes: ["image/jpeg", "image/png", "image/webp"],
      maxSize: 2 * 1024 * 1024,
    });
    student.profilePic = profilePicPath
      .replace(/\\/g, "/")
      .replace("public/", "");
  }

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
  res
    .status(200)
    .json({
      success: true,
      message: "Student updated successfully",
      data: studentData,
    });
});

// DELETE STUDENT
const deleteStudent = catchAsync(async (req, res, next) => {
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
});

module.exports = {
  getAllStudents,
  getStudentById,
  filterStudents,
  searchStudents,
  updateStudent,
  deleteStudent,
};
