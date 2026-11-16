# Multi-stage build for JNB Align on Google Cloud Run
FROM node:22-alpine AS builder
WORKDIR /app

# Copy dependency specifications
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy project files & build frontend + pre-compile backend server.mjs
COPY . .
RUN npm run build && npx esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=server.mjs

# Runner stage
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

# Copy built frontend assets, public files, and compiled server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.mjs ./server.mjs

EXPOSE 8080

CMD ["node", "server.mjs"]
