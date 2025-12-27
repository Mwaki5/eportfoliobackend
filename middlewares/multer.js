// middleware/multerGlobal.js
const multer = require("multer");

// Use memory storage so files are not auto-saved
const storage = multer.memoryStorage();

const upload = multer({ storage: storage });

// Export as middleware for any route
module.exports = upload;
