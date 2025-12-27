const express = require("express");
const router = express.Router();
const enrollmentController = require("../controllers/enrollmentController");
const verifyRoles = require("../middlewares/verifyRoles");
import { apiLimiter, authLimiter } from "../middlewares/apiLimiter.js";
// All routes require authentication
router.post("/", verifyRoles("staff"), enrollmentController.createEnrollment);
router.get("/", enrollmentController.getAllEnrollments);
router.get("/search/:identifier", enrollmentController.searchEnrollments);
router.get("/sessions/:studentId", enrollmentController.getEnrolledSessions);
router.get("/filter", enrollmentController.filterEnrollments);
router.get("/student/:studentId", enrollmentController.getEnrollmentsByStudent);
router.get("/unit/:unitCode", enrollmentController.getEnrollmentsByUnit);
router.put("/:id", verifyRoles("staff"), enrollmentController.updateEnrollment);
router.delete(
  "/:id",
  verifyRoles("staff"),
  enrollmentController.deleteEnrollment
);

module.exports = router;
