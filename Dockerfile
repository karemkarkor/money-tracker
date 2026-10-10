# =========================
# Build stage
# =========================
FROM node:22-slim AS build

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

# Install dependencies
RUN npm ci

# Generate Prisma Client
ENV DATABASE_URL="postgresql://user:password@localhost:5432/placeholder"
RUN npx prisma generate

# Copy application files
COPY src ./src
COPY public ./public

# Remove development dependencies
RUN npm prune --omit=dev


# =========================
# Production stage
# =========================
FROM node:22-slim AS runtime

ENV NODE_ENV=production

WORKDIR /app

# Production dependencies
COPY --from=build --chown=node:node /app/node_modules ./node_modules

# Application files
COPY --chown=node:node package*.json ./
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/src ./src
COPY --from=build --chown=node:node /app/public ./public

USER node

EXPOSE 3000

CMD ["npm", "start"]
