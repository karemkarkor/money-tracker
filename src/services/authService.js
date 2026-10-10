const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../db");
const { jwtSecret, jwtExpiresIn } = require("../config");
const HttpError = require("../utils/httpError");

const publicUser = ({ id, name, email }) => ({ id, name, email });
async function register({ name, email, password }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    throw new HttpError(409, "An account with this email already exists.");
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });
  return {
    user: publicUser(user),
    token: jwt.sign({}, jwtSecret, {
      subject: user.id,
      expiresIn: jwtExpiresIn,
    }),
  };
}
async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, "Email or password is incorrect.");
  }
  return {
    user: publicUser(user),
    token: jwt.sign({}, jwtSecret, {
      subject: user.id,
      expiresIn: jwtExpiresIn,
    }),
  };
}
module.exports = { register, login };
