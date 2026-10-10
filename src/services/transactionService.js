const prisma = require('../db');

function filters(query, userId) {
  const where = { userId };
  if (query.category) where.category = query.category;
  if (query.type) where.type = query.type;
  if (query.from || query.to) {
    where.date = {};
    if (query.from) where.date.gte = new Date(`${query.from}T00:00:00.000Z`);
    if (query.to) where.date.lte = new Date(`${query.to}T00:00:00.000Z`);
  }
  return where;
}

async function list(userId, query) {
  const where = filters(query, userId);
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 50));
  const [items, total] = await Promise.all([
    prisma.transaction.findMany({ where, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }], skip: (page - 1) * limit, take: limit }),
    prisma.transaction.count({ where })
  ]);
  return { items, page, limit, total };
}

async function summary(userId, query) {
  const where = filters(query, userId);
  const rows = await prisma.transaction.findMany({ where, select: { type: true, amount: true, category: true } });
  const result = { income: 0, expense: 0, byCategory: {} };
  for (const row of rows) {
    const amount = Number(row.amount);
    result[row.type] += amount;
    if (row.type === 'expense') result.byCategory[row.category] = (result.byCategory[row.category] || 0) + amount;
  }
  result.balance = result.income - result.expense;
  return result;
}

module.exports = {
  list,
  summary,
  create: (userId, data) => prisma.transaction.create({ data: { ...data, userId } }),
  update: (userId, id, data) => prisma.transaction.updateMany({ where: { id, userId }, data }),
  findOwned: (userId, id) => prisma.transaction.findFirst({ where: { id, userId } }),
  remove: (userId, id) => prisma.transaction.deleteMany({ where: { id, userId } })
};
