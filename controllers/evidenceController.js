const { Evidence, Unit, User } = require("../models");
const AppError = require("../utils/AppError");
const { validateAndSaveFile } = require("../services/fileHandler");
const { app, audit, error } = require("../utils/logger");

// Helper to determine evidence type
const getEvidenceType = (mimeType) => {
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("image/")) return "image";
  return "unknown";
};

// ===== CREATE EVIDENCE =====
const createEvidence = async (req, res, next) => {
  try {
    const { unitCode, description } = req.body;
    if (!req.file) throw new AppError("Evidence file is required", 400);

    // Verify student exists
    const student = await User.findOne({
      where: { userId: req.userId, role: "student" },
    });
    if (!student) throw new AppError("Student not found", 404);

    // Verify unit exists
    const unit = await Unit.findOne({ where: { unitCode } });
    if (!unit) throw new AppError("Unit not found", 404);

    // Determine evidence type
    const evidenceType = getEvidenceType(req.file.mimetype);
    const allowedTypes =
      evidenceType === "video"
        ? [
            "video/mp4",
            "video/mpeg",
            "video/quicktime",
            "video/x-msvideo",
            "video/webm",
          ]
        : ["image/jpeg", "image/png", "image/webp", "image/gif"];

    const filePath = await validateAndSaveFile(req.file, "evidences", {
      allowedTypes,
      maxSize: evidenceType === "video" ? 100 * 1024 * 1024 : 10 * 1024 * 1024,
    });

    const filepath = filePath.replace(/\\/g, "/").replace("public/", "");

    const evidence = await Evidence.create({
      studentId: req.userId,
      unitCode: unit.unitCode,
      filename: filepath,
      originalname: req.file.originalname,
      description: description || null,
      evidenceType,
      uploadedAt: new Date(),
    });

    // Audit log
    audit("CREATE_EVIDENCE", req, {
      resource_type: "Evidence",
      resource_id: evidence.id,
      student_id: req.userId,
      unit_code: unitCode,
      evidence_type: evidenceType,
      result: "SUCCESS",
    });

    res.status(201).json({
      success: true,
      message: "Evidence uploaded successfully",
      data: evidence,
    });
  } catch (err) {
    error("CREATE_EVIDENCE_ERROR", req, err);
    next(err);
  }
};

// ===== GET ALL EVIDENCE =====
const getAllEvidence = async (req, res, next) => {
  try {
    const evidence = await Evidence.findAll({
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
      order: [["uploadedAt", "DESC"]],
    });

    res.status(200).json({ success: true, data: evidence });

    app("GET_ALL_EVIDENCE", req, { count: evidence.length });
  } catch (err) {
    error("GET_ALL_EVIDENCE_ERROR", req, err);
    next(err);
  }
};

// ===== GET EVIDENCE BY STUDENT =====
const getEvidenceByStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const evidence = await Evidence.findAll({
      include: [
        {
          model: User,
          as: "User",
          attributes: ["userId", "firstname", "lastname"],
          where: { userId: studentId },
          required: true,
        },
        {
          model: Unit,
          as: "Unit",
          attributes: ["unitCode", "unitName", "staffId"],
        },
      ],
      order: [
        [{ model: Unit, as: "Unit" }, "unitCode", "ASC"],
        ["evidenceType", "ASC"],
        ["uploadedAt", "DESC"],
      ],
    });

    const organized = {};
    evidence.forEach((item) => {
      const unitCode = item.Unit?.unitCode || "Unknown";
      if (!organized[unitCode]) {
        organized[unitCode] = {
          unitCode,
          unitName: item.Unit?.unitName,
          images: [],
          videos: [],
        };
      }
      if (item.evidenceType === "image") organized[unitCode].images.push(item);
      else if (item.evidenceType === "video")
        organized[unitCode].videos.push(item);
    });

    res.status(200).json({ success: true, data: Object.values(organized) });

    app("GET_EVIDENCE_BY_STUDENT", req, { studentId, count: evidence.length });
  } catch (err) {
    error("GET_EVIDENCE_BY_STUDENT_ERROR", req, err);
    next(err);
  }
};

// ===== GET VIDEOS BY STUDENT PER UNIT =====
const getVideosByStudentUnit = async (req, res, next) => {
  try {
    const { studentId, unitCode } = req.params;

    const videos = await Evidence.findAll({
      where: { studentId, unitCode, evidenceType: "video" },
      include: [
        {
          model: Unit,
          as: "Unit",
          attributes: ["unitCode", "unitName", "staffId"],
        },
        {
          model: User,
          as: "User",
          attributes: ["userId", "firstname", "lastname"],
        },
      ],
      order: [["uploadedAt", "DESC"]],
    });

    res.status(200).json({ success: true, data: videos });

    app("GET_VIDEOS_BY_STUDENT_UNIT", req, {
      studentId,
      unitCode,
      count: videos.length,
    });
  } catch (err) {
    error("GET_VIDEOS_BY_STUDENT_UNIT_ERROR", req, err);
    next(err);
  }
};

// ===== GET EVIDENCE BY UNIT =====
const getEvidenceByUnit = async (req, res, next) => {
  try {
    const { unitCode } = req.params;

    const evidence = await Evidence.findAll({
      where: { unitCode },
      include: [
        {
          model: User,
          as: "User",
          attributes: ["userId", "firstname", "lastname", "email"],
        },
      ],
      order: [["uploadedAt", "DESC"]],
    });

    res.status(200).json({ success: true, data: evidence });

    app("GET_EVIDENCE_BY_UNIT", req, { unitCode, count: evidence.length });
  } catch (err) {
    error("GET_EVIDENCE_BY_UNIT_ERROR", req, err);
    next(err);
  }
};

// ===== UPDATE EVIDENCE =====
const updateEvidence = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { studentId, unitCode, description } = req.body;

    const evidence = await Evidence.findByPk(id);
    if (!evidence) throw new AppError("Evidence not found", 404);

    if (studentId) {
      const student = await User.findOne({
        where: { userId: studentId, role: "student" },
      });
      if (!student) throw new AppError("Student not found", 404);
      evidence.studentId = studentId;
    }

    if (unitCode) {
      const unit = await Unit.findOne({ where: { unitCode } });
      if (!unit) throw new AppError("Unit not found", 404);
      evidence.unitCode = unitCode;
    }

    if (description !== undefined) evidence.description = description;

    if (req.file) {
      const evidenceType = getEvidenceType(req.file.mimetype);
      const allowedTypes =
        evidenceType === "video"
          ? [
              "video/mp4",
              "video/mpeg",
              "video/quicktime",
              "video/x-msvideo",
              "video/webm",
            ]
          : ["image/jpeg", "image/png", "image/webp", "image/gif"];

      const filePath = await validateAndSaveFile(req.file, "evidences", {
        allowedTypes,
        maxSize:
          evidenceType === "video" ? 100 * 1024 * 1024 : 10 * 1024 * 1024,
      });
      const filepath = filePath.replace(/\\/g, "/").replace("public/", "");

      evidence.filename = filepath;
      evidence.originalname = req.file.originalname;
      evidence.evidenceType = evidenceType;
    }

    await evidence.save();

    audit("UPDATE_EVIDENCE", req, {
      resource_type: "Evidence",
      resource_id: evidence.id,
      student_id: evidence.studentId,
      unit_code: evidence.unitCode,
      evidence_type: evidence.evidenceType,
      result: "SUCCESS",
    });

    res
      .status(200)
      .json({
        success: true,
        message: "Evidence updated successfully",
        data: evidence,
      });
  } catch (err) {
    error("UPDATE_EVIDENCE_ERROR", req, err);
    next(err);
  }
};

// ===== DELETE EVIDENCE =====
const deleteEvidence = async (req, res, next) => {
  try {
    const { id } = req.params;
    const evidence = await Evidence.findByPk(id);
    if (!evidence) throw new AppError("Evidence not found", 404);

    await evidence.destroy();

    audit("DELETE_EVIDENCE", req, {
      resource_type: "Evidence",
      resource_id: id,
      result: "SUCCESS",
    });

    res
      .status(200)
      .json({ success: true, message: "Evidence deleted successfully" });
  } catch (err) {
    error("DELETE_EVIDENCE_ERROR", req, err);
    next(err);
  }
};

module.exports = {
  createEvidence,
  getAllEvidence,
  getEvidenceByStudent,
  getVideosByStudentUnit,
  getEvidenceByUnit,
  updateEvidence,
  deleteEvidence,
};
