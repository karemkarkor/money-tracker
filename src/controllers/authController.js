const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');
const { isEmail } = require('../utils/validation');

function parse(data, isRegister) {
  const input = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  const details = [];
  const result = {};  

  if (isRegister) {
    if (typeof input.name !== 'string') {
      details.push({ field: 'name', message: 'Name must be a string.' });
    } else {
      result.name = input.name.trim();
      if (result.name.length < 2 || result.name.length > 80) {
        details.push({ field: 'name', message: 'Name must be between 2 and 80 characters.' });
      }
    }
  }

  if (typeof input.email !== 'string' || !isEmail(input.email)) {
    details.push({ field: 'email', message: 'Please enter a valid email address.' });
  } else {
    result.email = input.email.toLowerCase().trim();
  }

  if (typeof input.password !== 'string') {
    details.push({ field: 'password', message: 'Password must be a string.' });
  } else {
    result.password = input.password;
    if (isRegister && input.password.length < 8) {
      details.push({ field: 'password', message: 'Password must be at least 8 characters.' });
    }
    if ((isRegister && input.password.length > 72) || (!isRegister && (input.password.length < 1 || input.password.length > 72))) {
      details.push({ field: 'password', message: 'Password must be between 1 and 72 characters.' });
    }
  }

  if (details.length) {
    const error = new Error('Please check the information you entered.');
    error.status = 400;
    error.details = details;
    throw error;
  }
  return result;
}

exports.register = asyncHandler(async (req, res) => res.status(201).json(await authService.register(parse(req.body, true))));
exports.login = asyncHandler(async (req, res) => res.json(await authService.login(parse(req.body, false))));
