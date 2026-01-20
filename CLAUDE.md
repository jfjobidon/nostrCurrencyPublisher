# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Currency Rate Publisher - Node.js service that fetches currency exchange rates and publishes them to a Nostr relay as kind <EVENT_KIND> events.

- **Fiat rates**: On schedule (see `fiat.schedule` in `config.js`) from Frankfurter API
- **Bitcoin rate**: On schedule (see `bitcoin.schedule` in `config.js`) from Blockchain.info API

## Commands

```bash
npm install            # Install dependencies
npm start              # Run the unified publisher
npm run test:fiat      # Test fiat API connection
npm run test:bitcoin   # Test Bitcoin API connection
npm run generate-key   # Generate a new Nostr keypair
npm run docker:build   # Build Docker image
npm run docker:up      # Start container
npm run docker:down    # Stop and remove container
```

## Environment Variables

- `NOSTR_PRIVATE_KEY` (required) - Hex-encoded Nostr private key (64 chars)
- `RELAY_URL` (optional) - WebSocket URL for Nostr relay (default: `ws://localhost:8080`)

Configure in `.env` file (see `.env.example`).

## Architecture

```
publishCurrencies.js     # Controller - scheduling and orchestration
├── currencyRates.js     # fetchCurrencyRates() - Frankfurter API
├── bitcoinRates.js      # fetchBitcoinRate() - Blockchain.info API
├── nostrUtils.js        # publishEventToNostr(), publishFiatRatesToNostr(), publishBitcoinRateToNostr()
└── config.js            # All configuration (relay, fiat, bitcoin settings)
```

The controller handles all scheduling:
- Fiat: (quarter hours by default) see `fiat.schedule` in `config.js`
- Bitcoin: (minute 0 by default) see `bitcoin.schedule` in `config.js`

## Nostr Event Details

| Event | d-tag | Source | Schedule |
|-------|-------|--------|----------|
| Fiat | `<APP_NAME>-currency-rates` | frankfurter.app | quarter hours by default (0, 15, 30, 45) |
| Bitcoin | `<APP_NAME>-bitcoin-rates` | blockchain.info | hour by default (minute 0) |

Events use kind <EVENT_KIND> (configurable in `config.js`).
