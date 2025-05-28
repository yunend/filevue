# 使用 Node.js 官方镜像作为基础
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install --registry=https://registry.npmmirror.com

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY server.js ./
COPY config.js ./

# 或者先创建目标目录再复制
RUN mkdir -p public-bak
COPY public/ ./public-bak/


ENV NODE_ENV=production
EXPOSE 8001
CMD ["node", "server.js"]
