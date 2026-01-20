FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY currency-rate-publisher.js .
COPY .env .

CMD ["node", "currency-rate-publisher.js"]
