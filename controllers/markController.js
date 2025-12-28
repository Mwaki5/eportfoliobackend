const { Marks, Unit, User, Enrollment } = require("../models");
const { Op } = require("sequelize");
const AppError = require("../utils/AppError");
const { app, audit, error } = require("../utils/logger");
const catchAsync = require("../utils/catchAsync");

const isValid = (val) => val !== undefined && val !== null && val !== "";

// ===== CREATE / UPDATE MARKS =====
const createMarks = catchAsync(async (req, res, next) => {
  const {
    studentId,
    unitCode,
    theory1,
    theory2,
    theory3,
    prac1,
    prac2,
    prac3,
  } = req.body;

  const student = await User.findOne({
    where: { userId: studentId, role: "student" },
  });
  if (!student) return next(new AppError("Student not found", 404));

  const unit = await Unit.findOne({ where: { unitCode } });
  if (!unit) return next(new AppError("Unit not found", 404));

  const enrollment = await Enrollment.findOne({
    where: { studentId, unitCode },
  });
  if (!enrollment)
    return next(new AppError("Student must enroll for the unit first", 404));

  let marks = await Marks.findOne({ where: { studentId, unitCode } });

  if (marks) {
    // Update only provided fields
    if (isValid(theory1)) marks.theory1 = theory1;
    if (isValid(theory2)) marks.theory2 = theory2;
    if (isValid(theory3)) marks.theory3 = theory3;
    if (isValid(prac1)) marks.prac1 = prac1;
    if (isValid(prac2)) marks.prac2 = prac2;
    if (isValid(prac3)) marks.prac3 = prac3;
    await marks.save();

    audit("UPDATE_MARKS", req, {
      resource_type: "Marks",
      resource_id: marks.id,
      student_id: studentId,
      unit_code: unitCode,
      result: "SUCCESS",
    });
    return res
      .status(200)
      .json({
        success: true,
        message: "Marks updated successfully",
        data: marks,
      });
  }

  marks = await Marks.create({
    studentId,
    unitCode: unit.unitCode,
    theory1,
    theory2,
    theory3,
    prac1,
    prac2,
    prac3,
  });
  audit("CREATE_MARKS", req, {
    resource_type: "Marks",
    resource_id: marks.id,
    student_id: studentId,
    unit_code: unitCode,
    result: "SUCCESS",
  });

  res
    .status(201)
    .json({
      success: true,
      message: "Marks registered successfully",
      data: marks,
    });
});

// ===== GET MARKS =====
const getAllMarks = catchAsync(async (req, res, next) => {
  const marks = await Marks.findAll({
    include: [
      {
        model: User,
        as: "User",
        attributes: ["userId", "firstname", "lastname", "email"],
      },
      { model: Unit, as: "Unit", attributes: ["unitCode", "staffId"] },
    ],
  });
  app("GET_ALL_MARKS", req, { count: marks.length });
  res.status(200).json({ success: true, data: marks });
});

const getMarksByStudentId = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const student = await User.findOne({ where: { userId, role: "student" } });
  if (!student) return next(new AppError("Student not found", 404));

  const marks = await Marks.findAll({
    where: { studentId: userId },
    include: [
      { model: Unit, as: "Unit", attributes: ["unitCode", "unitName"] },
    ],
  });
  app("GET_MARKS_BY_STUDENT", req, { studentId: userId, count: marks.length });
  res.status(200).json({ success: true, data: marks });
});

const getMarksByUnit = catchAsync(async (req, res, next) => {
  const { unitCode } = req.params;
  const unit = await Unit.findOne({ where: { unitCode } });
  if (!unit) return next(new AppError("Unit not found", 404));

  const marks = await Marks.findAll({
    where: { unitCode },
    include: [
      {
        model: User,
        as: "User",
        attributes: ["userId", "firstname", "lastname", "email"],
      },
      {
        model: Unit,
        as: "Unit",
        attributes: ["unitCode", "unitName", "staffId"],
      },
    ],
  });
  app("GET_MARKS_BY_UNIT", req, { unitCode, count: marks.length });
  res.status(200).json({ success: true, data: marks });
});

const updateMarks = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { theory1, theory2, theory3, prac1, prac2, prac3 } = req.body;

  const marks = await Marks.findByPk(id);
  if (!marks) return next(new AppError("Marks not found", 404));

  if (isValid(theory1)) marks.theory1 = theory1;
  if (isValid(theory2)) marks.theory2 = theory2;
  if (isValid(theory3)) marks.theory3 = theory3;
  if (isValid(prac1)) marks.prac1 = prac1;
  if (isValid(prac2)) marks.prac2 = prac2;
  if (isValid(prac3)) marks.prac3 = prac3;

  await marks.save();
  audit("UPDATE_MARKS", req, {
    resource_type: "Marks",
    resource_id: marks.id,
    student_id: marks.studentId,
    unit_code: marks.unitCode,
    result: "SUCCESS",
  });
  res
    .status(200)
    .json({
      success: true,
      message: "Marks updated successfully",
      data: marks,
    });
});

const deleteMarks = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const marks = await Marks.findByPk(id);
  if (!marks) return next(new AppError("Marks not found", 404));

  await marks.destroy();
  audit("DELETE_MARKS", req, {
    resource_type: "Marks",
    resource_id: id,
    result: "SUCCESS",
  });
  res
    .status(200)
    .json({ success: true, message: "Marks deleted successfully" });
});

module.exports = {
  createMarks,
  getAllMarks,
  getMarksByStudentId,
  getMarksByUnit,
  updateMarks,
  deleteMarks,
};
