# --- Frontend build ---
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# --- Backend deps ---
FROM node:18-alpine AS backend-deps
WORKDIR /app
RUN apk add --no-cache python3 make g++ cairo-dev jpeg-dev pango-dev musl-dev giflib-dev pixman-dev pangomm-dev libjpeg-turbo-dev freetype-dev
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# --- Runtime image ---
FROM node:18-alpine
WORKDIR /app
RUN apk add --no-cache cairo-dev jpeg-dev pango-dev musl-dev giflib-dev pixman-dev pangomm-dev libjpeg-turbo-dev freetype-dev

COPY --from=backend-deps /app/node_modules ./node_modules
COPY src ./src
COPY database ./database
COPY README.md ./README.md
COPY Hostinger.md ./Hostinger.md
COPY Hostinger-Variables.md ./Hostinger-Variables.md
COPY OHIP-Configuration.md ./OHIP-Configuration.md

# Built frontend assets
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

RUN mkdir -p logs uploads \
  && addgroup -S nodejs \
  && adduser -S nodejs -G nodejs \
  && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node src/healthcheck.js

CMD ["node", "src/index.js"]
