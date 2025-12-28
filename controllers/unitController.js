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

    // Check if unit exists
    const existingUnit = await Unit.findOne({ where: { unitCode } });
    if (existingUnit) {
      return res
        .status(409)
        .json({ success: false, message: "Unit code already exists" });
    }

    // Validate staff
    const staff = await User.findOne({
      where: { userId: staffId, role: "staff" },
    });
    if (!staff) {
      return res
        .status(404)
        .json({ success: false, message: "Staff member not found" });
    }

    const unit = await Unit.create({ unitCode, unitName, staffId });
    audit("CREATE_UNIT", req, { unitCode });

    return res.status(201).json({
      success: true,
      message: "Unit created successfully",
      data: unit,
    });
  } catch (err) {
    error("CREATE_UNIT_ERROR", req, { error: err });
    return next(new AppError("Failed to create unit", 500));
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

    audit("FETCH_ALL_UNITS", req, { count: units.length });
    return res
      .status(200)
      .json({ success: true, count: units.length, data: units });
  } catch (err) {
    error("FETCH_ALL_UNITS_ERROR", req, { error: err });
    return next(new AppError("Failed to fetch units", 500));
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
    return res
      .status(200)
      .json({ success: true, count: units.length, data: units });
  } catch (err) {
    error("FILTER_UNITS_ERROR", req, { error: err });
    return next(new AppError("Failed to filter units", 500));
  }
};

// ===== GET UNIT BY CODE =====
const getUnitByCode = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    if (!isValid(identifier)) {
      return res
        .status(400)
        .json({ success: false, message: "A valid unit code is required" });
    }

    const unit = await Unit.findOne({
      where: { unitCode: identifier },
      include: {
        model: User,
        as: "Staff",
        attributes: ["userId", "firstname", "lastname", "email"],
      },
      attributes: { exclude: ["createdAt", "updatedAt"] },
    });

    if (!unit) {
      return res
        .status(404)
        .json({ success: false, message: `No unit found for: ${identifier}` });
    }

    audit("FETCH_UNIT_BY_CODE", req, { unitCode: identifier });
    return res.status(200).json({ success: true, data: unit });
  } catch (err) {
    error("GET_UNIT_BY_CODE_ERROR", req, { error: err });
    return next(new AppError("Failed to fetch unit", 500));
  }
};

// ===== UPDATE UNIT =====
const updateUnit = async (req, res, next) => {
  try {
    const { unitCode } = req.params;
    const { newStaffId, newUnitCode, newUnitName } = req.body;

    const unit = await Unit.findOne({ where: { unitCode } });
    if (!unit)
      return res
        .status(404)
        .json({ success: false, message: "Unit not found" });

    if (newStaffId) {
      const staff = await User.findOne({
        where: { userId: newStaffId, role: "staff" },
      });
      if (!staff)
        return res
          .status(404)
          .json({ success: false, message: "Staff member not found" });
      unit.staffId = newStaffId;
    }

    if (newUnitCode) unit.unitCode = newUnitCode;
    if (newUnitName) unit.unitName = newUnitName;

    await unit.save();
    audit("UPDATE_UNIT", req, { unitCode });

    return res
      .status(200)
      .json({
        success: true,
        message: "Unit updated successfully",
        data: unit,
      });
  } catch (err) {
    error("UPDATE_UNIT_ERROR", req, { error: err });
    return next(new AppError("Failed to update unit", 500));
  }
};

// ===== DELETE UNIT =====
const deleteUnit = async (req, res, next) => {
  try {
    const { unitCode } = req.params;
    const unit = await Unit.findOne({ where: { unitCode } });
    if (!unit)
      return res
        .status(404)
        .json({ success: false, message: "Unit not found" });

    await unit.destroy();
    audit("DELETE_UNIT", req, { unitCode });

    return res
      .status(200)
      .json({ success: true, message: "Unit deleted successfully" });
  } catch (err) {
    error("DELETE_UNIT_ERROR", req, { error: err });
    return next(new AppError("Failed to delete unit", 500));
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
