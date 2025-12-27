const express = require("express");
const router = express.Router();
const markController = require("../controllers/markController");
const verifyRoles = require("../middlewares/verifyRoles");

// All routes require authentication
router.post("/", verifyRoles("staff"), markController.createMarks);
router.get("/", markController.getAllMarks);
router.get("/:userId", markController.getMarksByStudentId);
router.get(
  "/student/:userId/session/:session",
  markController.getMarksBySession
);
router.get("/search/:unitCode", markController.getMarksByUnit);
router.put("/:id", verifyRoles("staff"), markController.updateMarks);
router.delete("/:id", verifyRoles("staff"), markController.deleteMarks);

module.exports = router;
