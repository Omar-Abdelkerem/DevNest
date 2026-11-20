FROM node:22-slim AS base
WORKDIR /app

# Install OpenSSL required by Prisma query engine
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy manifests and install dependencies
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

# Copy Prisma schema & generate client
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

# Copy application source
COPY src ./src

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "src/server.js"]
