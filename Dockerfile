# Multi-stage build for JNB Align on Google Cloud Run
FROM node:22-alpine AS builder
WORKDIR /app

# Copy dependency specifications
COPY package*.json ./
RUN npm ci

# Copy project files & build frontend
COPY . .
RUN npm run build

# Runner stage
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
RUN npm ci --omit=dev && npm install -g tsx

# Copy built frontend assets, public files and server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src ./src

EXPOSE 8080

CMD ["tsx", "server.ts"]
