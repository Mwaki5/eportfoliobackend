const { Enrollment, Unit, User } = require("../models");
const { Op, Sequelize } = require("sequelize");
const AppError = require("../utils/AppError");
const { app, audit, error } = require("../utils/logger");

// Helper to validate values
const isValid = (val) => val && val !== "undefined" && val.trim() !== "";

// --- Create Enrollment ---
const createEnrollment = async (req, res, next) => {
  try {
    const { studentId, unitCode, session } = req.body;

    // Verify student
    const student = await User.findOne({
      where: { userId: studentId, role: "student" },
    });
    if (!student) throw new AppError("Student not found", 404);

    // Verify unit
    const unit = await Unit.findOne({ where: { unitCode } });
    if (!unit) throw new AppError("Unit not found", 404);

    // Check existing enrollment
    const existingEnrollment = await Enrollment.findOne({
      where: { studentId, unitCode, session },
    });
    if (existingEnrollment)
      throw new AppError("Student already enrolled for this session", 409);

    const enrollment = await Enrollment.create({
      studentId,
      unitCode,
      session,
    });

    // Audit log
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
  } catch (err) {
    error("CREATE_ENROLLMENT_ERROR", req, err);
    next(err);
  }
};

// --- Get All Enrollments ---
const getAllEnrollments = async (req, res, next) => {
  try {
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

    res.status(200).json({ success: true, data: enrollments });

    // App log
    app("GET_ALL_ENROLLMENTS", req, { count: enrollments.length });
  } catch (err) {
    error("GET_ALL_ENROLLMENTS_ERROR", req, err);
    next(err);
  }
};

// --- Get Enrollments by Student ---
const getEnrollmentsByStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const student = await User.findOne({
      where: { userId: studentId, role: "student" },
    });
    if (!student) throw new AppError("Student not found", 404);

    const enrollments = await Enrollment.findAll({
      where: { studentId },
      include: [{ model: Unit, as: "Unit" }],
    });

    res.status(200).json({ success: true, data: enrollments });

    app("GET_ENROLLMENTS_BY_STUDENT", req, {
      studentId,
      count: enrollments.length,
    });
  } catch (err) {
    error("GET_ENROLLMENTS_BY_STUDENT_ERROR", req, err);
    next(err);
  }
};

// --- Get Enrollments by Unit ---
const getEnrollmentsByUnit = async (req, res, next) => {
  try {
    const { unitCode } = req.params;

    const enrollments = await Enrollment.findAll({
      where: { unitCode },
      include: [
        {
          model: User,
          as: "User",
          attributes: ["userId", "firstname", "lastname", "email"],
        },
      ],
    });

    res.status(200).json({ success: true, data: enrollments });

    app("GET_ENROLLMENTS_BY_UNIT", req, {
      unitCode,
      count: enrollments.length,
    });
  } catch (err) {
    error("GET_ENROLLMENTS_BY_UNIT_ERROR", req, err);
    next(err);
  }
};

// --- Update Enrollment ---
const updateEnrollment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { studentId, unitCode, session } = req.body;

    const enrollment = await Enrollment.findByPk(id);
    if (!enrollment) throw new AppError("Enrollment not found", 404);

    if (studentId) {
      const student = await User.findOne({
        where: { userId: studentId, role: "student" },
      });
      if (!student) throw new AppError("Student not found", 404);
      enrollment.studentId = student.userId;
    }

    if (unitCode) {
      const unit = await Unit.findOne({ where: { unitCode } });
      if (!unit) throw new AppError("Unit not found", 404);
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
  } catch (err) {
    error("UPDATE_ENROLLMENT_ERROR", req, err);
    next(err);
  }
};

// --- Delete Enrollment ---
const deleteEnrollment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const enrollment = await Enrollment.findByPk(id);
    if (!enrollment) throw new AppError("Enrollment not found", 404);

    await enrollment.destroy();

    audit("DELETE_ENROLLMENT", req, {
      resource_type: "Enrollment",
      resource_id: id,
      result: "SUCCESS",
    });

    res
      .status(200)
      .json({ success: true, message: "Enrollment deleted successfully" });
  } catch (err) {
    error("DELETE_ENROLLMENT_ERROR", req, err);
    next(err);
  }
};

// --- Search / Filter Enrollments ---
const searchEnrollments = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    if (!identifier) throw new AppError("Search parameter is required", 400);

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

    res.status(200).json({ success: true, data: enrollments });
    app("SEARCH_ENROLLMENTS", req, { identifier, count: enrollments.length });
  } catch (err) {
    error("SEARCH_ENROLLMENTS_ERROR", req, err);
    next(err);
  }
};

// --- Filter Enrollments with Query Params ---
const filterEnrollments = async (req, res, next) => {
  try {
    const { studentId, unitCode, session } = req.query;
    let whereClause = {};
    if (isValid(studentId))
      whereClause.studentId = { [Op.like]: `%${studentId}%` };
    if (isValid(unitCode))
      whereClause.unitCode = { [Op.like]: `%${unitCode}%` };
    if (isValid(session)) whereClause.session = { [Op.like]: `%${session}%` };

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

    res
      .status(200)
      .json({ success: true, count: enrollments.length, data: enrollments });
    app("FILTER_ENROLLMENTS", req, {
      query: req.query,
      count: enrollments.length,
    });
  } catch (err) {
    error("FILTER_ENROLLMENTS_ERROR", req, err);
    next(err);
  }
};

// --- Get Enrolled Sessions ---
const getEnrolledSessions = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const sessions = await Enrollment.findAll({
      include: [
        {
          model: User,
          as: "User",
          where: { userId: studentId },
          attributes: [],
        },
      ],
      attributes: [
        [Sequelize.fn("DISTINCT", Sequelize.col("session")), "session"],
      ],
      raw: true,
      order: [["session", "ASC"]],
    });

    const sessionList = sessions.map((s) => s.session);
    res.status(200).json({ success: true, data: sessionList });

    app("GET_ENROLLED_SESSIONS", req, { studentId, count: sessionList.length });
  } catch (err) {
    error("GET_ENROLLED_SESSIONS_ERROR", req, err);
    next(err);
  }
};

module.exports = {
  createEnrollment,
  getAllEnrollments,
  getEnrollmentsByStudent,
  getEnrollmentsByUnit,
  updateEnrollment,
  deleteEnrollment,
  searchEnrollments,
  filterEnrollments,
  getEnrolledSessions,
};
