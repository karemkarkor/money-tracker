const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');
const HttpError = require('../utils/httpError');

module.exports = (req, _res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return next(new HttpError(401, 'Sign in to continue.'));
  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = { id: payload.sub };
    next();
  } catch {
    next(new HttpError(401, 'Your session is invalid or expired.'));
  }
};
