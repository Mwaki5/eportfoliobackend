const { Marks, Unit, User, Enrollment } = require("../models");
const { Op } = require("sequelize");
const AppError = require("../utils/AppError");
const { app, audit, error } = require("../utils/logger");

// Helper to check if value is valid
const isValid = (val) => val !== undefined && val !== null && val !== "";

// ===== CREATE / REGISTER MARKS =====
const createMarks = async (req, res, next) => {
  try {
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

    // Verify student
    const student = await User.findOne({
      where: { userId: studentId, role: "student" },
    });
    if (!student) throw new AppError("Student not found", 404);

    // Verify unit
    const unit = await Unit.findOne({ where: { unitCode } });
    if (!unit) throw new AppError("Unit not found", 404);

    // Verify enrollment
    const enrollment = await Enrollment.findOne({
      where: { studentId, unitCode },
    });
    if (!enrollment)
      throw new AppError("Student must enroll for the unit first", 404);

    // Check existing marks
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

      res
        .status(200)
        .json({
          success: true,
          message: "Marks updated successfully",
          data: marks,
        });
    } else {
      // Create new marks
      marks = await Marks.create({
        studentId,
        unitCode: unit.unitCode,
        theory1: theory1 || null,
        theory2: theory2 || null,
        theory3: theory3 || null,
        prac1: prac1 || null,
        prac2: prac2 || null,
        prac3: prac3 || null,
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
    }
  } catch (err) {
    error("CREATE_MARKS_ERROR", req, err);
    next(err);
  }
};

// ===== GET ALL MARKS =====
const getAllMarks = async (req, res, next) => {
  try {
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
  } catch (err) {
    error("GET_ALL_MARKS_ERROR", req, err);
    next(err);
  }
};

// ===== GET MARKS BY STUDENT =====
const getMarksByStudentId = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const student = await User.findOne({ where: { userId, role: "student" } });
    if (!student) throw new AppError("Student not found", 404);

    const marks = await Marks.findAll({
      where: { studentId: userId },
      include: [
        { model: Unit, as: "Unit", attributes: ["unitCode", "unitName"] },
      ],
    });

    app("GET_MARKS_BY_STUDENT", req, {
      studentId: userId,
      count: marks.length,
    });

    res.status(200).json({ success: true, data: marks });
  } catch (err) {
    error("GET_MARKS_BY_STUDENT_ERROR", req, err);
    next(err);
  }
};

// ===== GET MARKS BY UNIT =====
const getMarksByUnit = async (req, res, next) => {
  try {
    const { unitCode } = req.params;

    const unit = await Unit.findOne({ where: { unitCode } });
    if (!unit) throw new AppError("Unit not found", 404);

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
  } catch (err) {
    error("GET_MARKS_BY_UNIT_ERROR", req, err);
    next(err);
  }
};

// ===== GET MARKS BY SESSION =====
const getMarksBySession = async (req, res, next) => {
  try {
    const { userId, session } = req.params;

    const student = await User.findOne({
      where: { userId, role: "student" },
      attributes: ["id"],
    });
    if (!student) throw new AppError("Student not found", 404);

    const unitRows = await Enrollment.findAll({
      where: { studentId: student.id, session },
      attributes: ["unitCode"],
      raw: true,
    });

    const unitCodes = unitRows.map((u) => u.unitCode);
    if (!unitCodes.length)
      return res.status(200).json({ success: true, data: [] });

    const marks = await Marks.findAll({
      where: { studentId: student.id, unitCode: { [Op.in]: unitCodes } },
      include: [
        { model: Unit, as: "Unit", attributes: ["unitCode", "unitName"] },
      ],
      order: [["unitCode", "ASC"]],
    });

    app("GET_MARKS_BY_SESSION", req, {
      studentId: student.id,
      session,
      count: marks.length,
    });

    res.status(200).json({ success: true, data: marks });
  } catch (err) {
    error("GET_MARKS_BY_SESSION_ERROR", req, err);
    next(err);
  }
};

// ===== UPDATE MARKS =====
const updateMarks = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { theory1, theory2, theory3, prac1, prac2, prac3 } = req.body;

    const marks = await Marks.findByPk(id);
    if (!marks) throw new AppError("Marks not found", 404);

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
  } catch (err) {
    error("UPDATE_MARKS_ERROR", req, err);
    next(err);
  }
};

// ===== DELETE MARKS =====
const deleteMarks = async (req, res, next) => {
  try {
    const { id } = req.params;

    const marks = await Marks.findByPk(id);
    if (!marks) throw new AppError("Marks not found", 404);

    await marks.destroy();

    audit("DELETE_MARKS", req, {
      resource_type: "Marks",
      resource_id: id,
      result: "SUCCESS",
    });

    res
      .status(200)
      .json({ success: true, message: "Marks deleted successfully" });
  } catch (err) {
    error("DELETE_MARKS_ERROR", req, err);
    next(err);
  }
};

module.exports = {
  createMarks,
  getAllMarks,
  getMarksByStudentId,
  getMarksByUnit,
  getMarksBySession,
  updateMarks,
  deleteMarks,
};
