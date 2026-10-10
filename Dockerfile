FROM node:22-slim AS build

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci \
    && DATABASE_URL="postgresql://neondb_owner:npg_2lZKHWzpGT5a@ep-tiny-surf-b9f5cqqr-pooler.c-7.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require" npx prisma generate \
    && npm prune --omit=dev

FROM node:22-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node src ./src
COPY --chown=node:node public ./public
COPY --from=build --chown=node:node /app/prisma ./prisma

EXPOSE 3000

USER node

CMD ["npm", "start"]