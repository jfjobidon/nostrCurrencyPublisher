FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY publishCurrencies.js .
COPY currency-rate-publisher.js .
COPY bitcoin-rate-publisher.js .
COPY config.js .

CMD ["node", "publishCurrencies.js"]
