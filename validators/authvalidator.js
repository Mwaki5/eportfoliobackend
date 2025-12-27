const Joi = require("joi");

// Registration schema
const registerSchema = Joi.object({
  userId: Joi.string().min(2).required(),
  email: Joi.string().email().required(),
  level: Joi.string().required(),
  // password: Joi.string().min(6).required(),
  firstname: Joi.string().min(2).required(),
  lastname: Joi.string().min(2).required(),
  profilePic: Joi.required(),
  department: Joi.string().min(2).required(),
  role: Joi.string().valid("student", "staff").required(),
  gender: Joi.string().valid("Male", "Female").required(),
});

// Login schema
const loginSchema = Joi.object({
  userId: Joi.string().required(),
  password: Joi.string().required(),
});

module.exports = { registerSchema, loginSchema };
