# Architecture

## Overview

Currency Rate Publisher is a Node.js service that fetches currency exchange rates and publishes them to a Nostr relay as kind 30078 replaceable events.

Two separate publishers run independently:
- **Fiat rates**: Fetches from Frankfurter API (ECB data), publishes every hour
- **Bitcoin rate**: Fetches from Blockchain.info API, publishes every 15 minutes

## Data Flow

```
Frankfurter API  -->  currency-rate-publisher.js  -->  Nostr Relay
(EUR, CAD, GBP,       (fetch, sign, publish)          (kind 30078)
 JPY, CNY, MXN)       every hour                       d: splitstr-currency-rates

Blockchain.info  -->  bitcoin-rate-publisher.js   -->  Nostr Relay
(BTC/USD)             (fetch, sign, publish)          (kind 30078)
                      every 15 minutes                 d: splitstr-bitcoin-rates
```

## Fiat Currency Event Example

```json
{
  "kind": 30078,
  "id": "2e1de8a6e9961b5f36f2f8f09451fea8feb6a7e63b0cfaf3568bcff7ed799842",
  "pubkey": "c562d7111df113c06bf0824fa4a2a916f33368e1660643857d4343845192d425",
  "created_at": 1768874402,
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
  "content": "{\"baseCurrency\":\"USD\",\"rates\":{\"CAD\":1.3884,\"CNY\":6.9634,\"EUR\":0.85977,\"GBP\":0.74551,\"JPY\":157.93,\"MXN\":17.6296},\"updatedAt\":\"2026-01-20T02:00:02.235Z\",\"source\":\"frankfurter.app\"}",
  "sig": "90185256881f77911e82f0bdcbd06b3f74752cc27d5f2d6843646a6b10ff8b0b6322bf338f50d7bd6e0b7cec840d95e720c7309ead995f6c5c1c35110b7a56ac"
}
```

## Bitcoin Event Example

```json
{
  "kind": 30078,
  "id": "abc123...",
  "pubkey": "c562d7111df113c06bf0824fa4a2a916f33368e1660643857d4343845192d425",
  "created_at": 1768874402,
  "tags": [
    ["d", "splitstr-bitcoin-rates"],
    ["t", "splitstr"],
    ["t", "bitcoin-rates"],
    ["L", "currency"],
    ["l", "BTC", "currency"],
    ["l", "USD", "currency"]
  ],
  "content": "{\"baseCurrency\":\"BTC\",\"rates\":{\"USD\":104500.00},\"updatedAt\":\"2026-01-20T02:15:00.000Z\",\"source\":\"blockchain.info\"}",
  "sig": "..."
}
```

## Event Details

- **kind 30078**: Replaceable parameterized event (NIP-78)
- **d-tag**: Unique identifier for each rate feed
  - `splitstr-currency-rates` for fiat
  - `splitstr-bitcoin-rates` for Bitcoin
- **L/l tags**: NIP-32 labels for currency filtering
- **content**: JSON with base currency, rates object, timestamp, and source

## Client Usage

To convert BTC to other currencies, clients fetch both events and compute:
```
BTC/EUR = BTC/USD × USD/EUR
```
