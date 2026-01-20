# Currency Rate Publisher for Splitstr

Automatically fetches currency exchange rates and publishes them to a Nostr relay.

## Features

### Fiat Currency Rates
- ✅ Fetches rates for: USD, EUR, CAD, GBP, JPY, CNY, MXN
- ✅ Publishes to Nostr relay as kind 30078 events
- ✅ Runs automatically every hour (on the hour: 1:00, 2:00, etc.)
- ✅ Uses free Frankfurter API (no API key needed)

### Bitcoin Rate
- ✅ Fetches BTC/USD rate from Blockchain.info API
- ✅ Publishes as separate kind 30078 event
- ✅ Runs automatically every 15 minutes
- ✅ No API key needed

- ✅ Graceful error handling and logging

## Prerequisites

- Node.js >= 18.0.0
- A running Nostr relay (default: ws://localhost:8080)
- A Nostr private key (will be generated during setup)

## Setup

### 1. Install Dependencies

```bash
cd /Users/jfjobidon/Desktop/redshift.nosync/nostrapp/splitstr
npm install
```

### 2. Generate Nostr Keys

```bash
npm run generate-key
```

This will output:
```
Private Key (hex): abc123def456...
Keep this secret and add to .env file!
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your private key:
```
NOSTR_PRIVATE_KEY=your_private_key_from_step_2
```

### 4. Start the Publishers

**Fiat currency rates (hourly):**
```bash
npm start
```

**Bitcoin rate (every 15 minutes):**
```bash
npm run start:bitcoin
```

## Usage

### Run as a Background Service

Using PM2 (recommended for production):

```bash
# Install PM2 globally
npm install -g pm2

# Start the service
pm2 start currency-rate-publisher.js --name splitstr-rates

# View logs
pm2 logs splitstr-rates

# Stop the service
pm2 stop splitstr-rates

# Restart
pm2 restart splitstr-rates

# Auto-start on system boot
pm2 startup
pm2 save
```

### Run with Docker

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["node", "currency-rate-publisher.js"]
```

Build and run:

```bash
docker build -t currency-publisher .
docker run -d --name currency-publisher --add-host=host.docker.internal:host-gateway --restart unless-stopped currency-rate-publisher
```

> **Note:** The `--add-host=host.docker.internal:host-gateway` flag allows the container to resolve `host.docker.internal` to your host machine. Since the default relay URL is `ws://localhost:8080`, you must set the `RELAY_URL` environment variable to `ws://host.docker.internal:8080` for the container to reach a relay running on your host:
> ```bash
> docker run -d --name currency-publisher \
>   --add-host=host.docker.internal:host-gateway \
>   -e RELAY_URL=ws://host.docker.internal:8080 \
>   --restart unless-stopped currency-rate-publisher
> ```

**For Docker:**
```bash
docker run -e RELAY_URL=ws://host.docker.internal:8080 ...
```

**For local development:**
```bash
npm start  # Uses ws://localhost:8080 from config.js
```

### Test API Connection

**Test fiat rates:**
```bash
npm test
```

**Test Bitcoin rate:**
```bash
npm run test:bitcoin
```

These will fetch rates once without publishing to Nostr.

## Event Format

### Fiat Currency Event

```json
{
  "kind": 30078,
  "pubkey": "<your-pubkey>",
  "created_at": 1705680000,
  "tags": [
    ["d", "splitstr-currency-rates"],
    ["t", "splitstr"],
    ["t", "currency-rates"],
    ["L", "currency"],
    ["l", "USD", "currency"],
    ["l", "EUR", "currency"],
    ["l", "CAD", "currency"],
    ["l", "GBP", "currency"],
    ["l", "JPY", "currency"],
    ["l", "CNY", "currency"],
    ["l", "MXN", "currency"]
  ],
  "content": "{\"baseCurrency\":\"USD\",\"rates\":{\"EUR\":0.92,\"CAD\":1.35,\"GBP\":0.79,\"JPY\":148.5,\"CNY\":7.24,\"MXN\":16.8},\"updatedAt\":\"2025-01-19T14:00:00Z\",\"source\":\"frankfurter.app\"}",
  "sig": "<signature>"
}
```

### Bitcoin Event

```json
{
  "kind": 30078,
  "pubkey": "<your-pubkey>",
  "created_at": 1705680000,
  "tags": [
    ["d", "splitstr-bitcoin-rates"],
    ["t", "splitstr"],
    ["t", "bitcoin-rates"],
    ["L", "currency"],
    ["l", "BTC", "currency"],
    ["l", "USD", "currency"]
  ],
  "content": "{\"baseCurrency\":\"BTC\",\"rates\":{\"USD\":104500.00},\"updatedAt\":\"2025-01-19T14:00:00Z\",\"source\":\"blockchain.info\"}",
  "sig": "<signature>"
}
```

### Content Schema

```typescript
interface CurrencyRatesEvent {
  baseCurrency: "USD";
  rates: {
    EUR: number;
    CAD: number;
    GBP: number;
    JPY: number;
    CNY: number;
    MXN: number;
  };
  updatedAt: string; // ISO timestamp
  source: string;    // "frankfurter.app"
}

interface BitcoinRatesEvent {
  baseCurrency: "BTC";
  rates: {
    USD: number;
  };
  updatedAt: string; // ISO timestamp
  source: string;    // "blockchain.info"
}
```

## Querying Events

To retrieve the latest rates from your Nostr client:

```javascript
import { SimplePool } from 'nostr-tools';

const pool = new SimplePool();
const relays = ['ws://localhost:8080'];

// Query fiat rates
const fiatEvents = await pool.querySync(relays, {
  kinds: [30078],
  '#d': ['splitstr-currency-rates'],
  limit: 1
});

// Query Bitcoin rate
const btcEvents = await pool.querySync(relays, {
  kinds: [30078],
  '#d': ['splitstr-bitcoin-rates'],
  limit: 1
});

if (fiatEvents.length > 0) {
  const rateData = JSON.parse(fiatEvents[0].content);
  console.log('Fiat rates:', rateData.rates);
}

if (btcEvents.length > 0) {
  const btcData = JSON.parse(btcEvents[0].content);
  console.log('BTC/USD:', btcData.rates.USD);
}
```

## Monitoring

### View Logs

```bash
# If running directly
# Logs are output to console

# If using PM2
pm2 logs splitstr-rates

# If using Docker
docker logs -f splitstr-rates
```

### Log Format

```
============================================================
[2025-01-19T14:00:00.000Z] Starting currency rate update...
============================================================
[2025-01-19T14:00:00.123Z] Fetching rates from: https://api.frankfurter.app/latest?from=USD&to=EUR,CAD,GBP,JPY,CNY,MXN
[2025-01-19T14:00:00.456Z] Successfully fetched rates: { EUR: 0.92, CAD: 1.35, ... }
[2025-01-19T14:00:00.789Z] Publishing event to ws://localhost:8080
Event ID: abc123...
Public Key: def456...
[2025-01-19T14:00:01.012Z] ✓ Successfully published to Nostr relay
============================================================
[2025-01-19T14:00:01.012Z] ✓ Update completed successfully
============================================================

Next update scheduled in 60 minutes
```

## Troubleshooting

### "NOSTR_PRIVATE_KEY environment variable not set"

Make sure you've created a `.env` file with your private key or set the environment variable:

```bash
export NOSTR_PRIVATE_KEY=your_hex_key_here
npm start
```

### "Connection to relay failed"

1. Check if your Nostr relay is running:
   ```bash
   # If using nostream or similar
   docker ps | grep nostr
   ```

2. Test relay connectivity:
   ```bash
   websocat ws://localhost:8080
   ```

3. Check firewall settings

### "Failed to fetch rates"

1. Check internet connection
2. Verify Frankfurter API is accessible:
   ```bash
   curl https://api.frankfurter.app/latest?from=USD&to=EUR
   ```

### Rate Limit Issues

Frankfurter API is free and has no rate limits for reasonable use. Running once per hour is well within acceptable use.

## Configuration

You can modify these constants in `currency-rate-publisher.js`:

```javascript
const RELAY_URL = 'ws://localhost:8080';  // Your relay URL
const CURRENCIES = ['EUR', 'CAD', 'GBP', 'JPY', 'CNY', 'MXN'];  // Currencies to fetch
const BASE_CURRENCY = 'USD';  // Base currency
```

## API Reference

### Frankfurter API (Fiat Rates)

- Endpoint: `https://api.frankfurter.app/latest`
- Documentation: https://www.frankfurter.app/docs/
- Rate Limit: None (reasonable use)
- Data Source: European Central Bank

### Blockchain.info API (Bitcoin Rate)

- Endpoint: `https://blockchain.info/ticker`
- Documentation: https://www.blockchain.com/explorer/api/exchange_rates_api
- Rate Limit: None (reasonable use)
- Data Source: Blockchain.com

### Supported Currencies

**Fiat (from Frankfurter):**
- USD - US Dollar (base)
- EUR - Euro
- CAD - Canadian Dollar
- GBP - British Pound
- JPY - Japanese Yen
- CNY - Chinese Yuan
- MXN - Mexican Peso

**Crypto (from Blockchain.info):**
- BTC - Bitcoin (priced in USD)

## Security Notes

- **Never commit your `.env` file** - it contains your private key
- Keep your private key secure - anyone with it can publish events as you
- Consider using a dedicated keypair for this service
- If compromised, generate a new keypair and update clients

## License

MIT

## Support

For issues or questions, contact the Splitstr development team.
