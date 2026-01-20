# Architecture

## Overview

Currency Rate Publisher is a Node.js service that fetches currency exchange rates and publishes them to a Nostr relay as kind 30078 replaceable events.

A unified controller runs both publishers:
- **Fiat rates**: Fetches from Frankfurter API (ECB data), publishes every 15 minutes
- **Bitcoin rate**: Fetches from Blockchain.info API, publishes every hour (on the hour)

## File Structure

```
publishCurrencies.js     # Controller - scheduling and orchestration
├── currencyRates.js     # Fetches fiat rates from Frankfurter API
├── bitcoinRates.js      # Fetches BTC rate from Blockchain.info
├── nostrUtils.js        # Nostr publishing utilities
└── config.js            # Configuration
```

## Data Flow

```
Frankfurter API  -->  currencyRates.js  -->  nostrUtils.js  -->  Nostr Relay
(EUR, CAD, GBP,       fetchCurrencyRates()   publishFiatRatesToNostr()   (kind 30078)
 JPY, CNY, MXN)                                                          d: splitstr-fiat-rates

Blockchain.info  -->  bitcoinRates.js   -->  nostrUtils.js  -->  Nostr Relay
(BTC/USD)             fetchBitcoinRate()     publishBitcoinRateToNostr() (kind 30078)
                                                                          d: splitstr-bitcoin-rates
```

## Scheduling

The controller (`publishCurrencies.js`) handles all timing:
- Runs fiat update every 15 minutes (on quarter hours: 0, 15, 30, 45)
- Runs Bitcoin update only on the hour (when minute = 0)
- Both run immediately on startup

## Fiat Currency Event Example

```json
{
  "kind": 30078,
  "id": "2e1de8a6...",
  "pubkey": "c562d711...",
  "created_at": 1768874402,
  "tags": [
    ["d", "splitstr-fiat-rates"],
    ["t", "splitstr"],
    ["t", "fiat"]
  ],
  "content": "{\"baseCurrency\":\"USD\",\"rates\":{\"CAD\":1.3884,\"CNY\":6.9634,\"EUR\":0.85977,\"GBP\":0.74551,\"JPY\":157.93,\"MXN\":17.6296},\"updatedAt\":\"2026-01-20T02:00:02.235Z\",\"source\":\"frankfurter.app\"}",
  "sig": "90185256..."
}
```

## Bitcoin Event Example

```json
{
  "kind": 30078,
  "id": "abc123...",
  "pubkey": "c562d711...",
  "created_at": 1768874402,
  "tags": [
    ["d", "splitstr-bitcoin-rates"],
    ["t", "splitstr"],
    ["t", "bitcoin-rates"]
  ],
  "content": "{\"baseCurrency\":\"BTC\",\"rates\":{\"USD\":104500.00},\"updatedAt\":\"2026-01-20T02:00:00.000Z\",\"source\":\"blockchain.info\"}",
  "sig": "..."
}
```

## Event Details

- **kind 30078**: Replaceable parameterized event (NIP-78)
- **d-tag**: Unique identifier for each rate feed
  - `splitstr-fiat-rates` for fiat
  - `splitstr-bitcoin-rates` for Bitcoin
- **t-tags**: Topic tags for filtering
- **content**: JSON with base currency, rates object, timestamp, and source

## Client Usage

To convert BTC to other currencies, clients fetch both events and compute:
```
BTC/EUR = BTC/USD * USD/EUR
```
