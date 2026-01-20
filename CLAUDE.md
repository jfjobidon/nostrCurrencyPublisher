# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Currency Rate Publisher for Splitstr - Node.js service that fetches currency exchange rates and publishes them to a Nostr relay as kind 30078 events.

- **Fiat rates**: Every 15 minutes from Frankfurter API
- **Bitcoin rate**: Every hour from Blockchain.info API

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
- Fiat: every 15 minutes (quarter hours)
- Bitcoin: every hour (minute 0)

## Nostr Event Details

| Event | d-tag | Source | Schedule |
|-------|-------|--------|----------|
| Fiat | `splitstr-fiat-rates` | frankfurter.app | 15 min |
| Bitcoin | `splitstr-bitcoin-rates` | blockchain.info | Hourly |

Events use kind 30078 (configurable in `config.js`).
