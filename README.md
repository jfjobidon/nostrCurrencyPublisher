# Currency Rate Publisher for Splitstr

Automatically fetches currency exchange rates and publishes them to a Nostr relay.

## Features

### Fiat Currency Rates
- Fetches rates for: USD, EUR, CAD, GBP, JPY, CNY, MXN
- Publishes to Nostr relay as kind 30078 events
- Runs automatically every 15 minutes
- Uses free Frankfurter API (no API key needed)

### Bitcoin Rate
- Fetches BTC/USD rate from Blockchain.info API
- Publishes as separate kind 30078 event
- Runs automatically every hour (on the hour)
- No API key needed

## Prerequisites

- Node.js >= 18.0.0
- A running Nostr relay (default: ws://localhost:8080)
- A Nostr private key (will be generated during setup)

## Setup

### 1. Install Dependencies

```bash
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

### 4. Start the Publisher

```bash
npm start
```

This runs the unified controller that publishes both fiat and Bitcoin rates on their respective schedules.

## Usage

### Run with Docker

Build and run:

```bash
npm run docker:build
npm run docker:up
```

Stop the container:

```bash
npm run docker:down
```

The container uses `--network host` to access the relay on localhost.

### Test API Connections

**Test fiat rates:**
```bash
npm run test:fiat
```

**Test Bitcoin rate:**
```bash
npm run test:bitcoin
```

These will fetch rates once without publishing to Nostr.

## Architecture

```
publishCurrencies.js     # Controller - schedules and orchestrates
├── currencyRates.js     # Fetches fiat rates from Frankfurter API
├── bitcoinRates.js      # Fetches BTC rate from Blockchain.info
├── nostrUtils.js        # Nostr publishing utilities
└── config.js            # Configuration
```

## Event Format

### Fiat Currency Event

```json
{
  "kind": 30078,
  "pubkey": "<your-pubkey>",
  "created_at": 1705680000,
  "tags": [
    ["d", "splitstr-fiat-rates"],
    ["t", "splitstr"],
    ["t", "fiat"]
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
    ["t", "bitcoin-rates"]
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
  '#d': ['splitstr-fiat-rates'],
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

# If using Docker
docker logs -f currency-publisher
```

## Troubleshooting

### "NOSTR_PRIVATE_KEY environment variable not set"

Make sure you've created a `.env` file with your private key:

```bash
cp .env.example .env
# Edit .env and add your key
```

### "Connection to relay failed"

1. Check if your Nostr relay is running
2. Verify the relay URL in config.js or RELAY_URL environment variable

### "Failed to fetch rates"

1. Check internet connection
2. Verify APIs are accessible:
   ```bash
   curl https://api.frankfurter.app/latest?from=USD&to=EUR
   curl https://blockchain.info/ticker
   ```

## Configuration

Edit `config.js` to customize:

- `relay.url` - Your relay URL
- `relay.eventKind` - Nostr event kind (default: 30078)
- `fiat.currencies` - Currencies to fetch
- `fiat.baseCurrency` - Base currency

## API Reference

### Frankfurter API (Fiat Rates)

- Endpoint: `https://api.frankfurter.app/latest`
- Documentation: https://www.frankfurter.app/docs/
- Data Source: European Central Bank

### Blockchain.info API (Bitcoin Rate)

- Endpoint: `https://blockchain.info/ticker`
- Documentation: https://www.blockchain.com/explorer/api/exchange_rates_api

## Security Notes

- **Never commit your `.env` file** - it contains your private key
- Keep your private key secure
- Consider using a dedicated keypair for this service

## License

MIT
