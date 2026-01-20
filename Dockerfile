FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY publishCurrencies.js .
COPY currencyRates.js .
COPY bitcoinRates.js .
COPY nostrUtils.js .
COPY config.js .

CMD ["node", "publishCurrencies.js"]
