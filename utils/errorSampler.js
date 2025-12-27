const seen = new Map();

module.exports = (code, windowMs = 60_000) => {
  const now = Date.now();

  if (!seen.has(code)) {
    seen.set(code, now);
    return true;
  }

  if (now - seen.get(code) > windowMs) {
    seen.set(code, now);
    return true;
  }

  return false;
};
