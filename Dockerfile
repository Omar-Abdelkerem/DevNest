FROM node:22-slim AS base
WORKDIR /app

# Install OpenSSL required by Prisma query engine
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy Prisma schema & config BEFORE npm install so `postinstall: prisma generate` finds it
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm install --no-audit --no-fund

# Copy application source
COPY src ./src

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "src/server.js"]
