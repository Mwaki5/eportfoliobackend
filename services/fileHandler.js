const fs = require("fs/promises");
const path = require("path");
const { v4: uuid } = require("uuid");

/**
 * Validate and save a file (ASYNC SAFE)
 */
const validateAndSaveFile = async (file, destFolder, options = {}) => {
  if (!file) throw new Error("No file provided");

  const { allowedTypes = [], maxSize = 10 * 1024 * 1024 } = options;

  // Validate type
  if (allowedTypes.length && !allowedTypes.includes(file.mimetype)) {
    throw new Error(`Invalid file type: ${file.mimetype}`);
  }

  // Validate size
  if (file.size > maxSize) {
    throw new Error("File size exceeds allowed limit");
  }

  // Create full path relative to project root
  const uploadsDir = path.join(process.cwd(), "public", destFolder);
  
  // Ensure directory exists (WAIT FOR IT)
  await fs.mkdir(uploadsDir, { recursive: true });

  // Generate filename
  const ext = path.extname(file.originalname);
  const filename = `${uuid()}${ext}`;
  const finalPath = path.join(uploadsDir, filename);

  // Write file (WAIT FOR IT)
  await fs.writeFile(finalPath, file.buffer);

  // Return path relative to public directory for URL access
  return path.join("public", destFolder, filename);
};

module.exports = { validateAndSaveFile };
