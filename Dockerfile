FROM node:22-alpine AS base
WORKDIR /app

# Install all dependencies (prisma CLI is needed for generate & migrate deploy)
COPY package.json package-lock.json ./
RUN npm ci

# Copy Prisma schema & generate client
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

# Copy application source
COPY src ./src

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
