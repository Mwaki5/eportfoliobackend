const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { registerSchema, loginSchema } = require("../validators/authvalidator");
const validate = require("../middlewares/validate");
const upload = require("../middlewares/multer");
const refreshToken = require("../controllers/refreshTokenController");
//import { apiLimiter, authLimiter } from "../middlewares/apiLimiter.js";
router.post(
  "/register",
  validate(registerSchema),
  upload.single("profilePic"),
  authController.registerUser
);
router.post("/login", validate(loginSchema), authController.loginUser);
router.post("/logout", authController.logoutUser);
router.post("/refresh-token", refreshToken.refreshToken);

module.exports = router;
