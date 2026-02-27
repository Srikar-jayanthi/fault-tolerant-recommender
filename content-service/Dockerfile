FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN apk add --no-cache curl
COPY . .
EXPOSE 8082
HEALTHCHECK --interval=10s --timeout=5s --retries=5 CMD node -e "require('http').get('http://localhost:8082/health', (res) => { if (res.statusCode === 200) process.exit(0); else process.exit(1); })"
CMD ["node", "index.js"]
