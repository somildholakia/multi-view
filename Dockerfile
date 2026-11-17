# The Playwright base image includes the matching Chromium browser and system libraries.
FROM mcr.microsoft.com/playwright:v1.65.1-noble AS builder

WORKDIR /workspace
RUN npm install --global pnpm@10.33.0

COPY . .
RUN pnpm install --no-frozen-lockfile

# For a remote deployment, build with VITE_API_URL set to the public HTTPS API URL.
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm build

FROM builder AS api
ENV NODE_ENV=production
EXPOSE 4000
CMD ["pnpm", "--filter", "@multiview/api", "start"]

FROM builder AS worker
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
CMD ["pnpm", "--filter", "@multiview/worker", "start"]

FROM nginx:1.27-alpine AS web
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /workspace/apps/web/dist /usr/share/nginx/html
EXPOSE 80
