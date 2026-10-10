# =========================
# Build stage
# =========================
FROM node:22-slim AS build

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
COPY src ./src
COPY public ./public

RUN npm ci

# Prisma Client generation
ENV DATABASE_URL="postgresql://user:password@localhost:5432/placeholder"
RUN npx prisma generate

# Remove development dependencies
RUN npm prune --omit=dev


# =========================
# Production stage
# =========================
FROM node:22-slim AS runtime

ENV NODE_ENV=production

WORKDIR /app

# Dependencies
COPY --from=build --chown=node:node /app/node_modules ./node_modules

# Application files
COPY --chown=node:node package*.json ./
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/src ./src
COPY --from=build --chown=node:node /app/public ./public

# Run as non-root
USER node

EXPOSE 3000

CMD ["npm", "start"]
