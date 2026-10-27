FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8787

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY tsconfig.json ./
COPY src ./src

USER node
EXPOSE 8787

CMD ["npx", "tsx", "src/index.ts"]
