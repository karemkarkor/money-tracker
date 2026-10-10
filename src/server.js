const app = require('./app');
const prisma = require('./db');
const { port } = require('./config');

const server = app.listen(port, () => console.log(`Pocketwise running at http://localhost:${port}`));
async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
