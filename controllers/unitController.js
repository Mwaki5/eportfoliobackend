const { Unit, User } = require("../models");
const { Op } = require("sequelize");
const AppError = require("../utils/AppError");
const { app, audit, error } = require("../utils/logger");

// Helper
const isValid = (val) => val && val !== "undefined" && val.trim() !== "";

// ===== CREATE UNIT =====
const createUnit = async (req, res, next) => {
  try {
    const { unitCode, staffId, unitName } = req.body;

    if (await Unit.findOne({ where: { unitCode } })) {
      return next(new AppError("Unit code already exists", 409));
    }

    const staff = await User.findOne({
      where: { userId: staffId, role: "staff" },
    });
    if (!staff) return next(new AppError("Staff member not found", 404));

    const unit = await Unit.create({ unitCode, unitName, staffId });

    audit("CREATE_UNIT", req, { unitCode });
    res
      .status(201)
      .json({
        success: true,
        message: "Unit created successfully",
        data: unit,
      });
  } catch (err) {
    error("CREATE_UNIT_ERROR", req, { error: err });
    next(err);
  }
};

// ===== GET ALL UNITS =====
const getAllUnits = async (req, res, next) => {
  try {
    const units = await Unit.findAll({
      include: {
        model: User,
        as: "Staff",
        attributes: ["userId", "firstname", "lastname", "email"],
      },
      order: [["unitCode", "ASC"]],
    });

    app("FETCH_ALL_UNITS", req, { count: units.length });
    res.status(200).json({ success: true, data: units });
  } catch (err) {
    error("FETCH_ALL_UNITS_ERROR", req, { error: err });
    next(err);
  }
};

// ===== FILTER UNITS =====
const filterUnits = async (req, res, next) => {
  try {
    const { unitCode, unitName, staffId } = req.query;
    const conditions = [];

    if (isValid(unitCode))
      conditions.push({ unitCode: { [Op.like]: `%${unitCode}%` } });
    if (isValid(unitName))
      conditions.push({ unitName: { [Op.like]: `%${unitName}%` } });
    if (isValid(staffId)) conditions.push({ staffId });

    const whereClause = conditions.length ? { [Op.and]: conditions } : {};

    const units = await Unit.findAll({
      where: whereClause,
      include: {
        model: User,
        as: "Staff",
        attributes: ["userId", "firstname", "lastname", "email"],
      },
      attributes: { exclude: ["createdAt", "updatedAt"] },
      order: [["unitCode", "ASC"]],
      limit: 50,
    });

    audit("FILTER_UNITS", req, { filters: req.query, count: units.length });
    res.status(200).json({ success: true, count: units.length, data: units });
  } catch (err) {
    error("FILTER_UNITS_ERROR", req, { error: err });
    next(err);
  }
};

// ===== GET UNIT BY CODE =====
const getUnitByCode = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    if (!isValid(identifier))
      return next(new AppError("A valid unit code is required", 400));

    const unit = await Unit.findOne({
      where: { unitCode: identifier },
      include: {
        model: User,
        as: "Staff",
        attributes: ["userId", "firstname", "lastname", "email"],
      },
      attributes: { exclude: ["createdAt", "updatedAt"] },
    });

    if (!unit)
      return next(new AppError(`No unit found for: ${identifier}`, 404));

    app("FETCH_UNIT_BY_CODE", req, { unitCode: identifier });
    res.status(200).json({ success: true, data: unit });
  } catch (err) {
    error("GET_UNIT_BY_CODE_ERROR", req, { error: err });
    next(err);
  }
};

// ===== UPDATE UNIT =====
const updateUnit = async (req, res, next) => {
  try {
    const { unitCode } = req.params;
    const { newStaffId, newUnitCode, newUnitName } = req.body;

    const unit = await Unit.findOne({ where: { unitCode } });
    if (!unit) return next(new AppError("Unit not found", 404));

    if (newStaffId) {
      const staff = await User.findOne({
        where: { userId: newStaffId, role: "staff" },
      });
      if (!staff) return next(new AppError("Staff member not found", 404));
      unit.staffId = newStaffId;
    }

    if (newUnitCode) unit.unitCode = newUnitCode;
    if (newUnitName) unit.unitName = newUnitName;

    await unit.save();
    audit("UPDATE_UNIT", req, { unitCode });
    res
      .status(200)
      .json({
        success: true,
        message: "Unit updated successfully",
        data: unit,
      });
  } catch (err) {
    error("UPDATE_UNIT_ERROR", req, { error: err });
    next(err);
  }
};

// ===== DELETE UNIT =====
const deleteUnit = async (req, res, next) => {
  try {
    const { unitCode } = req.params;
    const unit = await Unit.findOne({ where: { unitCode } });
    if (!unit) return next(new AppError("Unit not found", 404));

    await unit.destroy();
    audit("DELETE_UNIT", req, { unitCode });
    res
      .status(200)
      .json({ success: true, message: "Unit deleted successfully" });
  } catch (err) {
    error("DELETE_UNIT_ERROR", req, { error: err });
    next(err);
  }
};

module.exports = {
  createUnit,
  getAllUnits,
  getUnitByCode,
  updateUnit,
  deleteUnit,
  filterUnits,
};
