const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const verifyRoles = require("../middlewares/verifyRoles");
const upload = require("../middlewares/multer");

// All routes require authentication
router.get("/", studentController.getAllStudents);
router.get("/filter", studentController.filterStudents);
router.get("/search/:identifier", studentController.searchStudents);
router.get("/:studentId", studentController.getStudentById);
router.put(
  "/edit/:studentId",
  verifyRoles("staff"),
  studentController.updateStudent
);
router.delete(
  "/:studentId",
  verifyRoles("staff"),
  studentController.deleteStudent
);

module.exports = router;
