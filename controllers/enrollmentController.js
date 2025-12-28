const { Enrollment, Unit, User } = require("../models");
const { Op, Sequelize } = require("sequelize");
const AppError = require("../utils/AppError");
const { app, audit, error } = require("../utils/logger");
const catchAsync = require("../utils/catchAsync");

const isValid = (val) => val && val !== "undefined" && val.trim() !== "";

// --- CREATE ENROLLMENT ---
const createEnrollment = catchAsync(async (req, res) => {
  const { studentId, unitCode, session } = req.body;
  const student = await User.findOne({
    where: { userId: studentId, role: "student" },
  });
  if (!student) return next(new AppError("Student not found", 404));

  const unit = await Unit.findOne({ where: { unitCode } });
  if (!unit) return next(new AppError("Unit not found", 404));

  const existingEnrollment = await Enrollment.findOne({
    where: { studentId, unitCode, session },
  });
  if (existingEnrollment)
    return next(new AppError("Student already enrolled for this session", 409));

  const enrollment = await Enrollment.create({ studentId, unitCode, session });
  audit("CREATE_ENROLLMENT", req, {
    resource_type: "Enrollment",
    resource_id: enrollment.id,
    student_id: studentId,
    unit_code: unitCode,
    session,
    result: "SUCCESS",
  });

  res.status(201).json({
    success: true,
    message: "Enrollment created successfully",
    data: enrollment,
  });
});

// --- GET ENROLLMENTS ---
const getAllEnrollments = catchAsync(async (req, res) => {
  const enrollments = await Enrollment.findAll({
    include: [
      {
        model: User,
        as: "User",
        attributes: ["userId", "firstname", "lastname", "email"],
      },
      {
        model: Unit,
        as: "Unit",
        attributes: ["unitCode", "staffId", "unitName"],
      },
    ],
  });
  app("GET_ALL_ENROLLMENTS", req, { count: enrollments.length });
  res.status(200).json({ success: true, data: enrollments });
});

// --- GET ENROLLMENTS BY STUDENT ---
const getEnrollmentsByStudent = catchAsync(async (req, res) => {
  const { studentId } = req.params;
  const student = await User.findOne({
    where: { userId: studentId, role: "student" },
  });
  if (!student) return next(new AppError("Student not found", 404));

  const enrollments = await Enrollment.findAll({
    where: { studentId },
    include: [{ model: Unit, as: "Unit" }],
  });
  app("GET_ENROLLMENTS_BY_STUDENT", req, {
    studentId,
    count: enrollments.length,
  });
  res.status(200).json({ success: true, data: enrollments });
});

// --- UPDATE & DELETE & FILTER / SEARCH ---
const updateEnrollment = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { studentId, unitCode, session } = req.body;

  const enrollment = await Enrollment.findByPk(id);
  if (!enrollment) return next(new AppError("Enrollment not found", 404));

  if (studentId) {
    const student = await User.findOne({
      where: { userId: studentId, role: "student" },
    });
    if (!student) return next(new AppError("Student not found", 404));
    enrollment.studentId = student.userId;
  }

  if (unitCode) {
    const unit = await Unit.findOne({ where: { unitCode } });
    if (!unit) return next(new AppError("Unit not found", 404));
    enrollment.unitCode = unit.unitCode;
  }

  if (session) enrollment.session = session;
  await enrollment.save();

  audit("UPDATE_ENROLLMENT", req, {
    resource_type: "Enrollment",
    resource_id: enrollment.id,
    student_id: enrollment.studentId,
    unit_code: enrollment.unitCode,
    session: enrollment.session,
    result: "SUCCESS",
  });
  res.status(200).json({
    success: true,
    message: "Enrollment updated successfully",
    data: enrollment,
  });
});

const deleteEnrollment = catchAsync(async (req, res) => {
  const { id } = req.params;
  const enrollment = await Enrollment.findByPk(id);
  if (!enrollment) return next(new AppError("Enrollment not found", 404));

  await enrollment.destroy();
  audit("DELETE_ENROLLMENT", req, {
    resource_type: "Enrollment",
    resource_id: id,
    result: "SUCCESS",
  });
  res
    .status(200)
    .json({ success: true, message: "Enrollment deleted successfully" });
});

const searchEnrollments = catchAsync(async (req, res) => {
  const { identifier } = req.params;
  if (!identifier)
    return next(new AppError("Search parameter is required", 400));

  const enrollments = await Enrollment.findAll({
    where: {
      [Op.or]: [
        { session: { [Op.like]: `%${identifier}%` } },
        { "$Unit.unitCode$": { [Op.like]: `%${identifier}%` } },
        { "$User.userId$": { [Op.like]: `%${identifier}%` } },
      ],
    },
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
    limit: 50,
  });

  app("SEARCH_ENROLLMENTS", req, { identifier, count: enrollments.length });
  res.status(200).json({ success: true, data: enrollments });
});

const filterEnrollments = catchAsync(async (req, res) => {
  const { studentId, unitName, unitCode, session } = req.query;
  const whereClause = {};
  if (isValid(studentId))
    whereClause.studentId = { [Op.like]: `%${studentId}%` };
  if (isValid(unitCode)) whereClause.unitCode = { [Op.like]: `%${unitCode}%` };
  if (isValid(session)) whereClause.session = { [Op.like]: `%${session}%` };
  if (isValid(unitName)) whereClause.unitName = { [Op.like]: `%${unitName}%` };

  const enrollments = await Enrollment.findAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: "User",
        attributes: ["userId", "firstname", "lastname", "level"],
      },
      {
        model: Unit,
        as: "Unit",
        attributes: ["unitCode", "unitName", "staffId"],
      },
    ],
    limit: 50,
  });

  app("FILTER_ENROLLMENTS", req, {
    query: req.query,
    count: enrollments.length,
  });
  res
    .status(200)
    .json({ success: true, count: enrollments.length, data: enrollments });
});

const getEnrolledSessions = catchAsync(async (req, res) => {
  const { studentId } = req.params;
  const sessions = await Enrollment.findAll({
    include: [
      { model: User, as: "User", where: { userId: studentId }, attributes: [] },
    ],
    attributes: [
      [Sequelize.fn("DISTINCT", Sequelize.col("session")), "session"],
    ],
    raw: true,
    order: [["session", "ASC"]],
  });

  const sessionList = sessions.map((s) => s.session);
  app("GET_ENROLLED_SESSIONS", req, { studentId, count: sessionList.length });
  res.status(200).json({ success: true, data: sessionList });
});

module.exports = {
  createEnrollment,
  getAllEnrollments,
  getEnrollmentsByStudent,
  updateEnrollment,
  deleteEnrollment,
  searchEnrollments,
  filterEnrollments,
  getEnrolledSessions,
};
