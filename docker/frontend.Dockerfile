FROM node:22-alpine

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=development

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY frontend/package.json frontend/pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY frontend/ .

COPY docker/frontend-entrypoint.sh /frontend-entrypoint.sh
RUN chmod +x /frontend-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/frontend-entrypoint.sh"]
