FROM node:24-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --include=dev && npm cache clean --force
COPY . .

RUN mkdir -p /data && chown node:node /data
USER node

ENV PORT=8788
ENV DATABASE_PATH=/data/travel.sqlite
EXPOSE 8788
VOLUME ["/data"]

CMD ["node_modules/.bin/tsx", "server/index.ts"]
