const verifyRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.role) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - No role found",
      });
    }
    
    const rolesArray = [...allowedRoles];
    if (!rolesArray.includes(req.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden - Insufficient permissions",
      });
    }
    
    next();
  };
};
module.exports = verifyRoles;
