const crypto = require("crypto");

module.exports = (obj) => {
  if (!obj) return null;

  return crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex");
};
