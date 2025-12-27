module.exports = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    const userErrors = {};

    if (error) {
      error.details.map((d) => (userErrors[d.context.key] = d.message));
      return res.status(400).json({ success: false, message: userErrors });
    }

    next();
  };
};
