# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Currency Rate Publisher for Splitstr - Node.js services that fetch currency exchange rates and publish them to a Nostr relay as kind 30078 events.

- **Fiat rates**: Hourly updates from Frankfurter API
- **Bitcoin rate**: 15-minute updates from Blockchain.info API

## Commands

```bash
npm install            # Install dependencies
npm start              # Run fiat currency publisher (hourly)
npm run start:bitcoin  # Run Bitcoin publisher (every 15 min)
npm test               # Test fiat API connection
npm run test:bitcoin   # Test Bitcoin API connection
npm run generate-key   # Generate a new Nostr keypair
```

## Docker

```bash
docker build -t currency-publisher .
docker run -d --name currency-publisher --add-host=host.docker.internal:host-gateway --restart unless-stopped currency-rate-publisher
```

## Environment Variables

- `NOSTR_PRIVATE_KEY` (required) - Hex-encoded Nostr private key (64 chars)
- `RELAY_URL` (optional) - WebSocket URL for Nostr relay (default: `ws://localhost:8080`)

Configure in `.env` file (see `.env.example`).

## Architecture

Two independent publishers:

**currency-rate-publisher.js** (Fiat):
- `fetchCurrencyRates()` - Fetches from Frankfurter API
- `publishRatesToNostr()` - Publishes with d-tag `splitstr-currency-rates`
- `scheduleHourlyRuns()` - Runs every hour on the hour

**bitcoin-rate-publisher.js** (Bitcoin):
- `fetchBitcoinRate()` - Fetches from Blockchain.info API
- `publishBitcoinRateToNostr()` - Publishes with d-tag `splitstr-bitcoin-rates`
- `scheduleQuarterHourlyRuns()` - Runs every 15 minutes

Both require `ws` package with `global.WebSocket = WebSocket` for Node.js WebSocket support.

## Nostr Event Details

| Event | d-tag | Source | Schedule |
|-------|-------|--------|----------|
| Fiat | `splitstr-currency-rates` | frankfurter.app | Hourly |
| Bitcoin | `splitstr-bitcoin-rates` | blockchain.info | 15 min |
