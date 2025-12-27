const express = require("express");
const { sequelize } = require("./models");
const errorHandler = require("./middlewares/errorHandler");
const credentials = require("./middlewares/credentials");
const cors = require("cors");
const corsOption = require("./config/corsOptions");
const cookieParser = require("cookie-parser");
const AppError = require("./utils/AppError");
const path = require("path");
const { verifyJwt } = require("./middlewares/verifyJwt");

const app = express();

// ======== MIDDLEWARES ========
app.use(credentials);
app.use(cors(corsOption));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(require("./middlewares/requestId"));
app.use(require("./middlewares/latencyTracker"));

app.set("trust proxy", 1);

app.use("/public", express.static(path.join(__dirname, "public")));

// ======== REQUEST LOGGER ========
// logs IP, route, method, userId, body, frontendUrl, device

// ======== ROUTES ========
// Unprotected
app.use("/api/auth", require("./routes/authRoutes"));

// JWT PROTECTED
app.use(verifyJwt);

// Protected routes
app.use("/api/units", require("./routes/unitRoutes"));
app.use("/api/enrollments", require("./routes/enrollmentRoutes"));
app.use("/api/evidences", require("./routes/evidenceRoutes"));
app.use("/api/marks", require("./routes/markRoutes"));
app.use("/api/students", require("./routes/studentRoutes"));

// ======== 404 HANDLER ========
app.use((req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

// ======== GLOBAL ERROR HANDLER ========
app.use(errorHandler);

// ======== DB & SERVER ========
(async () => {
  try {
    await sequelize.authenticate();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Backend running on port ${PORT}`);
    });
  } catch (err) {
    // Startup errors go to error log
    console.error("Unable to connect to MySQL:", err);
  }
})();
