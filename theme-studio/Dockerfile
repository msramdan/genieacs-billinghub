# Build context = root repo genieacs-billinghub
#   docker compose -f theme-studio/docker-compose.yml up --build
# UI: http://HOST:5173
#
# Installer dikemas dari filesystem di container ini (bukan clone GitHub
# di server ACS tujuan), lalu dikirim via SSH.

FROM node:20-bookworm-slim

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends tar ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY theme-studio/package.json theme-studio/package-lock.json ./theme-studio/
WORKDIR /app/theme-studio
RUN npm ci

WORKDIR /app
COPY . .

WORKDIR /app/theme-studio
RUN npm run build && npm prune --production

ENV PORT=5174
ENV NODE_ENV=production
EXPOSE 5174

CMD ["node", "server/index.js"]
