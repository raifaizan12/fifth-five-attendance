FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev || (apt-get update && apt-get install -y --no-install-recommends python3 make g++ && npm ci --omit=dev && apt-get purge -y python3 make g++ && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*)
COPY . .
ENV NODE_ENV=production DATA_DIR=/data PORT=3000
VOLUME /data
EXPOSE 3000
CMD ["node", "server.js"]
