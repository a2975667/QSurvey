# syntax=docker/dockerfile:1

ARG NODE_VERSION=20

# 1) Build client
FROM node:${NODE_VERSION}-bookworm AS client-build
WORKDIR /workspace

# Install client deps
COPY client/package*.json ./client/
RUN cd client && npm ci

# Build client
COPY client ./client
RUN cd client && npm run build

# 2) Build server
FROM node:${NODE_VERSION}-bookworm AS server-build
WORKDIR /workspace

# Install server deps
COPY server/package*.json ./server/
RUN cd server && npm ci

# Build server
COPY server ./server
RUN cd server && npm run build

# 3) Runtime image
FROM node:${NODE_VERSION}-bookworm AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Install only production deps for server
COPY --from=server-build /workspace/server/package*.json ./
RUN npm ci --omit=dev

# Copy compiled server and static client build into expected locations
COPY --from=server-build /workspace/server/dist ./dist
COPY --from=client-build /workspace/client/build ./build

# Cloud Run provides PORT; the server uses process.env.PORT || 6060
ENV PORT=6060

EXPOSE 6060
CMD ["node", "dist/main.js"]

