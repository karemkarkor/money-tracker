const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const errorHandler = require('./middleware/errorHandler');
const HttpError = require('./utils/httpError');

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '20kb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api', (_req, _res, next) => next(new HttpError(404, 'API route not found.')));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(errorHandler);

module.exports = app;
