const service = require('../services/transactionService');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const { isISODate } = require('../utils/validation');

function parse(data) {
  const input = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  const details = [];
  const result = {};

  if (input.type !== 'income' && input.type !== 'expense') {
    details.push({ field: 'type', message: 'Type must be income or expense.' });
  } else {
    result.type = input.type;
  }

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 9999999999.99) {
    details.push({ field: 'amount', message: 'Amount must be greater than 0 and no more than 9999999999.99.' });
  } else {
    result.amount = amount;
  }

  if (typeof input.category !== 'string') {
    details.push({ field: 'category', message: 'Category must be a string.' });
  } else {
    result.category = input.category.trim();
    if (result.category.length < 1 || result.category.length > 60) {
      details.push({ field: 'category', message: 'Category must be between 1 and 60 characters.' });
    }
  }

  if (input.description !== undefined && input.description !== null) {
    if (typeof input.description !== 'string') {
      details.push({ field: 'description', message: 'Description must be a string.' });
    } else {
      result.description = input.description.trim();
      if (result.description.length > 240) {
        details.push({ field: 'description', message: 'Description must be at most 240 characters.' });
      }
    }
  } else {
    result.description = input.description;
  }

  if (!isISODate(input.date)) {
    details.push({ field: 'date', message: 'Date must use YYYY-MM-DD format and be a valid date.' });
  } else {
    result.date = input.date;
  }

  if (details.length) {
    const error = new HttpError(400, 'Please check the transaction details.');
    error.details = details;
    throw error;
  }
  return { ...result, date: new Date(`${result.date}T00:00:00.000Z`), description: result.description || null };
}
function validateFilters(req) {
  for (const key of ['from', 'to']) {
    if (req.query[key] && !/^\d{4}-\d{2}-\d{2}$/.test(req.query[key])) throw new HttpError(400, `${key} must use YYYY-MM-DD format.`);
  }
  if (req.query.from && req.query.to && req.query.from > req.query.to) throw new HttpError(400, 'from must be before or equal to to.');
  if (req.query.type && !['income', 'expense'].includes(req.query.type)) throw new HttpError(400, 'type must be income or expense.');
}

exports.list = asyncHandler(async (req, res) => { validateFilters(req); res.json(await service.list(req.user.id, req.query)); });
exports.summary = asyncHandler(async (req, res) => { validateFilters(req); res.json(await service.summary(req.user.id, req.query)); });
exports.create = asyncHandler(async (req, res) => res.status(201).json(await service.create(req.user.id, parse(req.body))));
exports.update = asyncHandler(async (req, res) => {
  const data = parse(req.body);
  const result = await service.update(req.user.id, req.params.id, data);
  if (!result.count) throw new HttpError(404, 'Transaction not found.');
  res.json(await service.findOwned(req.user.id, req.params.id));
});
exports.remove = asyncHandler(async (req, res) => {
  const result = await service.remove(req.user.id, req.params.id);
  if (!result.count) throw new HttpError(404, 'Transaction not found.');
  res.status(204).end();
});
